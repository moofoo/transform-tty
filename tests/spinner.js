const stripAnsi = require('strip-ansi');
const wcwidth = require('wcwidth');
const cliCursor = require('cli-cursor');

/*
    This spinner is a simplified, worm-themed variation of Ora.

    It has an improved clear method (optimizedClear), which is validated by the tests
    in spinner.test.js. This demonstrates how TransformTTY can be used to test and optimize CLI programs.
*/

class WormSpinner {
	constructor(options = {}) {
		this.stream = options.stream || process.stderr;

		this.theWorm = ['-', '~'];

		this.wormIndex = 0;

		this.text = options.text || '';

		this.indent = options.indent || 0;

		this.interval = options.interval || 200;

		this.clearScreenDown = this.stream.clearScreenDown
			? options.clearScreenDown !== false
			: false;

		this.hideCursor = options.hideCursor !== false;

		this.useOptimizedRender =
			options.useOptimizedRender !== undefined
				? options.useOptimizedRender
				: false;

		this.linesToClear = 0;

		this.id = undefined;
	}

	get indent() {
		return this._indent;
	}

	set indent(value) {
		const old = this.indent;

		this._indent = value;

		this.updateLineCount(old < value);
	}

	get text() {
		return this._text;
	}

	set text(value) {
		const old = this._text || '';

		this._text = value;

		this.updateLineCount(old.length < value.length);
	}

	get isPresentlyDoingTheWorm() {
		return this.id !== undefined;
	}

	updateLineCount() {
		const columns = this.stream.columns || 80;

		this.lineCount = 0;

		for (const line of stripAnsi(
			' '.repeat(this._indent) + '--' + this._text
		).split('\n')) {
			this.lineCount += Math.max(1, Math.ceil(wcwidth(line) / columns));
		}
	}

	frame() {
		let WORMFRAME = this.theWorm[this.wormIndex];

		this.wormIndex = ++this.wormIndex % this.theWorm.length;

		const fullText = typeof this.text === 'string' ? ' ' + this.text : '';

		return WORMFRAME + fullText;
	}

	_clear() {
		for (let i = 0; i < this.linesToClear; i++) {
			if (i > 0) {
				this.stream.moveCursor(0, -1);
			}

			this.stream.clearLine();

			this.stream.cursorTo(this._indent);
		}

		this.linesToClear = 0;
	}

	_render() {
		this._clear();

		this.stream.write(this.frame());

		this.linesToClear = this.lineCount;
	}

	_optimizedClear() {
		this.stream.cursorTo(0);

		for (let i = 0; i < this.linesToClear; i++) {
			if (i > 0) {
				this.stream.moveCursor(0, -1);
			}

			this.stream.clearLine(1);
		}
		this.stream.cursorTo(this._indent);

		this.linesToClear = 0;
	}

	_optimizedRender() {
		this._optimizedClear();

		this.stream.write(this.frame());

		this.linesToClear = this.lineCount;
	}

	clear() {
		if (this.useOptimizedRender) {
			this._optimizedClear();
		} else {
			this._clear();
		}
	}

	render() {
		if (this.useOptimizedRender) {
			this._optimizedRender();
		} else {
			this._render();
		}
	}

	badClear() {
		this.stream.clearScreenDown();

		this.stream.cursorTo(this._indent);

		this.linesToClear = 0;
	}

	badRender() {
		this.badClear();

		this.stream.write(this.frame());

		this.linesToClear = this.lineCount;
	}

	doTheWorm(text) {
		if (text) {
			this.text = text;
		}

		if (this.isPresentlyDoingTheWorm) {
			return this;
		}

		if (this.hideCursor) {
			cliCursor.hide(this.stream);
		}

		this.render();

		this.id = setInterval(this.render.bind(this), this.interval);

		return this;
	}

	pleaseStopDoingTheWorm() {
		clearInterval(this.id);
		this.id = undefined;

		this.wormIndex = 0;

		this.clear();

		if (this.hideCursor) {
			cliCursor.show(this.stream);
		}

		return this;
	}
}

module.exports = WormSpinner;
