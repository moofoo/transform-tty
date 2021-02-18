const { Transform } = require('stream');
const TerminalJSParser = require('./parsers/terminaljs');
const AnsiTerminalParser = require('./parsers/ansiTerminal');
const ansiEscapes = require('ansi-escapes');
const stripAnsi = require('strip-ansi');

const clearLineMap = new Map([
	[0, ansiEscapes.eraseLine],
	[1, ansiEscapes.eraseEndLine],
	[-1, ansiEscapes.eraseStartLine],
]);

class TransformTTY extends Transform {
	constructor(options = {}) {
		super(options);

		this._rows = options.rows || 25;

		this._columns = options.columns || 80;

		this._defaultParser =
			options.defaultParser === 'ansiTerminal'
				? AnsiTerminalParser
				: TerminalJSParser;

		this._crlf = options.crlf !== undefined ? options.crlf : false;

		this.isTTY = true;

		this._sequencers = [];

		this._chunks = [];

		this._hasTerminatingAnsiCodes = false;
	}

	get rows() {
		return this._rows;
	}

	set rows(rows) {
		this._rows = rows;

		if (this._sequencers) {
			this._sequencers.forEach((sequencer) => {
				sequencer.parser.resize(rows, this.columns);
			});
		}
	}

	get columns() {
		return this._columns;
	}

	set columns(columns) {
		this._columns = columns;

		if (this._sequencers) {
			this._sequencers.forEach((sequencer) => {
				sequencer.parser.resize(this._rows, columns);
			});
		}
	}

	addSequencer(add, clear = false) {
		this._addSequencer(this._defaultParser, {}, add, clear);
	}

	_addSequencer(parserClass, parserOptions = {}, add, clear) {
		if (!add) {
			add = (string) => {
				return !TransformTTY.onlyAnsi(string);
			};
		}

		if (clear === true) {
			clear = (string, sequencer) => {
				return sequencer.currentSequence.find((string) => {
					return RegExp('\\x1b\\[[0-2]?K|\\x1b\\[[0-2]?J').test(
						string
					);
				});
			};
		}

		const options = {
			rows: this.rows,
			columns: this.columns,
			...parserOptions,
		};

		if (this._defaultParser === AnsiTerminalParser) {
			options.newline_mode = this._crlf;
		} else {
			options.crlf = this._crlf;
		}

		const parser = new parserClass(options);

		this._sequencers.push({
			parser,
			add,
			clear,
			currentSequence: [],
			lastSequence: [],
			sequences: [],
			frames: [],
			codesAppended: false,
		});
	}

	_transform(chunk, encoding, callback) {
		const string = chunk.toString();

		if (TransformTTY.onlyAnsi(string)) {
			this._hasTerminatingAnsiCodes = true;
		} else {
			this._hasTerminatingAnsiCodes = false;
		}

		if (this._sequencers) {
			let trailingWhitespace = '';

			if (!TransformTTY.onlyAnsi(string)) {
				trailingWhitespace = string.match(/\s+$/g) || '';
				if (/^\s+$/.test(trailingWhitespace)) {
					trailingWhitespace = '';
				}
			}

			this._sequencers.forEach((sequencer) => {
				sequencer.currentSequence.push(string);
				sequencer.parser.write(string);
				const output = sequencer.parser.toString(trailingWhitespace);

				if (sequencer.add(string, sequencer)) {
					sequencer.sequences.push([...sequencer.currentSequence]);

					if (!/^\s$/.test(string)) {
						sequencer.frames.push(output);
					}
				}

				sequencer.lastSequence = sequencer.currentSequence;

				if (sequencer.clear && sequencer.clear(string, sequencer)) {
					sequencer.currentSequence = [];
					sequencer.parser.clear();
				}
			});
		}

		this._chunks.push(string);

		this.push(chunk);
		callback();
	}

	_appendCodes() {
		if (this._hasTerminatingAnsiCodes && this._sequencers.length) {
			this._sequencers.forEach((sequencer) => {
				if (!sequencer.codesAppended) {
					const output = sequencer.parser.toString();
					sequencer.sequences.push([...sequencer.lastSequence]);
					sequencer.frames.push(output);
					sequencer.codesAppended = true;
				}
			});
		}
	}

	getFrames() {
		if (this._sequencers.length) {
			this._appendCodes();
			if (this._sequencers.length === 1) {
				return this._sequencers[0].frames;
			} else {
				return this._sequencers.map((sequencer) => {
					return sequencer.frames;
				});
			}
		} else {
			throw new Error('getFrames called but no sequencers were defined');
		}
	}

	getSequences() {
		if (this._sequencers.length) {
			this._appendCodes();
			if (this._sequencers.length === 1) {
				return this._sequencers[0].sequences;
			} else {
				return this._sequencers.map((sequencer) => {
					return sequencer.sequences;
				});
			}
		} else {
			throw new Error(
				'getSequences called but no sequencers were defined'
			);
		}
	}

	getSequenceStrings() {
		if (this._sequencers.length) {
			const frames = this.getFrames();
			return frames.length === 1
				? frames[0]
				: frames.map(
						(sequencerFrames) =>
							sequencerFrames[sequencerFrames.length - 1]
				  );
		} else {
			throw new Error('getStrings called but no sequencers were defined');
		}
	}

	getWrites() {
		return [...this._chunks];
	}

	toString() {
		if (this._chunks.length === 0) {
			return '';
		}

		let parser;

		if (this._sequencers.length === 0) {
			parser = new this._defaultParser({
				rows: this.rows,
				columns: this.columns,
			});
		} else {
			parser = this._sequencers[0].parser.new();
		}

		this._chunks.forEach((chunk) => {
			parser.write(chunk);
		});

		return parser.toString();
	}

	clearLine(dir) {
		if (dir === undefined) {
			dir = 0;
		}

		this.write(clearLineMap.get(dir));
	}

	moveCursor(dx, dy) {
		this.write(ansiEscapes.cursorMove(dx, dy));
	}

	cursorTo(x, y) {
		this.write(ansiEscapes.cursorTo(x, y));
	}

	clearScreenDown() {
		this.write(ansiEscapes.eraseDown);
	}

	getColorDepth(env = {}) {
		return 1;
	}

	hasColors(count = 2, env = {}) {
		return count > 2 ? false : true;
	}

	getWindowSize() {
		return [this._columns, this._rows];
	}

	static onlyAnsi(string) {
		string = string
			.replace(ansiEscapes.cursorSavePosition, '')
			.replace(ansiEscapes.cursorRestorePosition, '')
			.replace('\u0007', '');

		return stripAnsi(string).length === 0;
	}
}

module.exports = TransformTTY;
