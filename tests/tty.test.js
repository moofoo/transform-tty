const { suite, test } = require('mocha');
const assert = require('assert').strict;
const TransformTTY = require('..');
const TerminalJSParser = require('../parsers/terminaljs');
const AnsiTerminalParser = require('../parsers/ansiTerminal');
const ansiEscapes = require('ansi-escapes');

const moreCodes = {
	insertSpaces(count = 1) {
		return `\x1b[${count}@`;
	},

	deleteCharacters(count = 1) {
		return `\x1b[${count}P`;
	},
	overwriteCharacters(count = 1) {
		return `\x1b[${count}X`;
	},
	insertLines(count = 1) {
		return `\x1b[${count}L`;
	},
	deleteLines(count = 1) {
		return `\x1b[${count}M`;
	},
	tabForward(count = 1) {
		return `\x1b[${count}I`;
	},
	tabBackward(count = 1) {
		return `\x1b[${count}Z`;
	},
	cursorUpOne: '\x1b[A',
	cursorDownOne: '\x1b[B',
	cursorForwardOne: '\x1b[C',
	cursorBackwardOne: '\x1b[D',
	setTabStop: `\x1bH`,
	clearTabStop: `\x1b[0g`,
	clearAllTabStops: `\x1b[3g`,
};

suite('transformTTY', () => {
	let transformTTY;
	let transformTTY2;
	let transformTTY3;

	const transformTTYWrite = (string, doComparison = true) => {
		transformTTY.write(string);
		if (doComparison) {
			transformTTY2.write(string);
			transformTTY3.write(string);
		}
	};

	const transformTTYClearLine = (dir = 0, doComparison = true) => {
		transformTTY.clearLine(dir);
		if (doComparison) {
			transformTTY2.clearLine(dir);
			transformTTY3.clearLine(dir);
		}
	};

	const transformTTYCursorTo = (x, y, doComparison = true) => {
		transformTTY.cursorTo(x, y);
		if (doComparison) {
			transformTTY2.cursorTo(x, y);
			transformTTY3.cursorTo(x, y);
		}
	};

	const transformTTYMoveCursor = (dx, dy, doComparison = true) => {
		transformTTY.moveCursor(dx, dy);
		if (doComparison) {
			transformTTY2.moveCursor(dx, dy);
			transformTTY3.moveCursor(dx, dy);
		}
	};

	const transformTTYClearScreenDown = (doComparison = true) => {
		transformTTY.clearScreenDown();
		if (doComparison) {
			transformTTY2.clearScreenDown();
			transformTTY3.clearScreenDown();
		}
	};

	beforeEach(() => {
		transformTTY = new TransformTTY();
		transformTTY.addSequencer();

		transformTTY2 = new TransformTTY();
		transformTTY2._addSequencer(TerminalJSParser, { crlf: false });

		transformTTY3 = new TransformTTY();
		transformTTY3._addSequencer(AnsiTerminalParser);
	});

	test('defaultParser', () => {
		let testTTY = new TransformTTY({ defaultParser: 'ansiTerminal' });

		assert(testTTY._defaultParser === AnsiTerminalParser);

		testTTY = new TransformTTY();

		assert(testTTY._defaultParser === TerminalJSParser);
	});

	test('getString', () => {
		transformTTYWrite('foo');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();

		assert.equal(toString, 'foo');
		assert.equal(toString2, toString3);
	});

	test('getWrites', () => {
		transformTTYWrite('foo');
		transformTTYWrite('bar');

		const writes = transformTTY.getWrites();

		assert.deepEqual(writes, ['foo', 'bar']);
	});

	test('setting row option', () => {
		transformTTY = new TransformTTY({ rows: 1 });
		testtTY2 = new TransformTTY({ rows: 1 });
		testtTY3 = new TransformTTY({ rows: 1 });

		transformTTYWrite('foo\nbar\nbaz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();

		assert.equal(toString, 'baz');
		assert.equal(toString2, toString3);
	});

	test('setting column option', () => {
		transformTTY = new TransformTTY({ columns: 3 });
		testtTY2 = new TransformTTY({ columns: 3 });
		testtTY3 = new TransformTTY({ columns: 3 });

		transformTTYWrite('foobarbaz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();

		assert.equal(toString, 'foo\nbar\nbaz');
		assert.equal(toString2, toString3);
	});

	test('resizing', () => {
		transformTTY.columns = 3;
		transformTTY.rows = 2;

		transformTTYWrite('foobarbaz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();

		assert.equal(toString, 'bar\nbaz');
		assert.equal(toString2, toString3);
	});

	test('clearLine', () => {
		transformTTYWrite('foo');
		transformTTYClearLine(0);
		transformTTYWrite('bar');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, '   bar');
		assert.deepEqual(writes, ['foo', '\x1B[2K', 'bar']);
		assert.deepEqual(sequences, [['foo'], ['foo', '\x1B[2K', 'bar']]);
		assert.deepEqual(frames, ['foo', '   bar']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('clearScreenDown', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYMoveCursor(0, -2);
		transformTTYClearScreenDown();
		transformTTYWrite('foo');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foofoo');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[2A', '\x1B[J', 'foo']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[2A', '\x1B[J', 'foo'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foofoo']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorTo', () => {
		transformTTYWrite('foo');
		transformTTYCursorTo(10);
		transformTTYWrite('bar');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();
		assert.deepEqual(toString, 'foo       bar');
		assert.deepEqual(writes, ['foo', '\x1B[11G', 'bar']);
		assert.deepEqual(sequences, [['foo'], ['foo', '\x1B[11G', 'bar']]);
		assert.deepEqual(frames, ['foo', 'foo       bar']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('moveCursor', () => {
		transformTTYWrite('foo');
		transformTTYWrite('\n');
		transformTTYWrite('bar');
		transformTTYWrite('\n');
		transformTTYWrite('baz');
		transformTTYMoveCursor(-3, -1);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();
		assert.deepEqual(toString, 'foo\nboz\nbaz');
		assert.deepEqual(writes, [
			'foo',
			'\n',
			'bar',
			'\n',
			'baz',
			'\x1B[3D\x1B[1A',
			'boz',
		]);
		assert.deepEqual(sequences, [
			['foo'],
			['foo', '\n'],
			['foo', '\n', 'bar'],
			['foo', '\n', 'bar', '\n'],
			['foo', '\n', 'bar', '\n', 'baz'],
			['foo', '\n', 'bar', '\n', 'baz', '\x1B[3D\x1B[1A', 'boz'],
		]);
		assert.deepEqual(frames, [
			'foo',
			'foo\nbar',
			'foo\nbar\nbaz',
			'foo\nboz\nbaz',
		]);
		assert.equal(toString, frames[frames.length - 1]);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorNextLine', () => {
		transformTTYWrite('foo');
		transformTTYWrite(ansiEscapes.cursorNextLine);
		transformTTYWrite(ansiEscapes.cursorNextLine);
		transformTTYWrite(ansiEscapes.cursorNextLine);
		transformTTYWrite('bar');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\n\n\nbar');
		assert.deepEqual(writes, ['foo', '\x1B[E', '\x1B[E', '\x1B[E', 'bar']);
		assert.deepEqual(sequences, [
			['foo'],
			['foo', '\x1B[E', '\x1B[E', '\x1B[E', 'bar'],
		]);
		assert.deepEqual(frames, ['foo', 'foo\n\n\nbar']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorPrevLine', () => {
		transformTTYWrite('foo\nbar');
		transformTTYWrite(ansiEscapes.cursorPrevLine);
		transformTTYWrite(ansiEscapes.cursorPrevLine);
		transformTTYWrite(ansiEscapes.cursorPrevLine);
		transformTTYWrite(ansiEscapes.cursorPrevLine);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'boz\nbar');
		assert.deepEqual(writes, [
			'foo\nbar',
			'\x1B[F',
			'\x1B[F',
			'\x1B[F',
			'\x1B[F',
			'boz',
		]);
		assert.deepEqual(sequences, [
			['foo\nbar'],
			['foo\nbar', '\x1B[F', '\x1B[F', '\x1B[F', '\x1B[F', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar', 'boz\nbar']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('scrollUp', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.scrollUp);
		transformTTYWrite(ansiEscapes.scrollUp);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();
		assert.deepEqual(toString, 'baz\n\n   boz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[S', '\x1B[S', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[S', '\x1B[S', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'baz\n\n   boz']);

		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('scrollDown', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.scrollDown);
		transformTTYWrite(ansiEscapes.scrollDown);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, '\n\nfooboz\nbar\nbaz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[T', '\x1B[T', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[T', '\x1B[T', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', '\n\nfooboz\nbar\nbaz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorSavePosition, cursorRestorePosition', () => {
		transformTTYWrite(ansiEscapes.cursorSavePosition);
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.cursorRestorePosition);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'boz\nbar\nbaz');
		assert.deepEqual(writes, ['\x1B[s', 'foo\nbar\nbaz', '\x1B[u', 'boz']);
		assert.deepEqual(sequences, [
			['\x1B[s', 'foo\nbar\nbaz'],
			['\x1B[s', 'foo\nbar\nbaz', '\x1B[u', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'boz\nbar\nbaz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorUpOne', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(moreCodes.cursorUpOne);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\nbarboz\nbaz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[A', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[A', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbarboz\nbaz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});
	test('cursorDownOne', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(moreCodes.cursorDownOne);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();
		assert.deepEqual(toString, 'foo\nbar\nbaz\n   boz');

		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[B', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[B', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbar\nbaz\n   boz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});
	test('cursorForwardOne', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(moreCodes.cursorForwardOne);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\nbar\nbaz boz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[C', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[C', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbar\nbaz boz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorBackwardOne', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(moreCodes.cursorBackwardOne);
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\nbar\nbaboz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[D', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[D', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbar\nbaboz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorUp', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.cursorUp(2));
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'fooboz\nbar\nbaz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[2A', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[2A', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'fooboz\nbar\nbaz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});
	test('cursorDown', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.cursorDown(2));
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();
		assert.deepEqual(toString, 'foo\nbar\nbaz\n\n   boz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[2B', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[2B', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbar\nbaz\n\n   boz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});
	test('cursorForward', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.cursorForward(2));
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\nbar\nbaz  boz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[2C', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[2C', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbar\nbaz  boz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('cursorBackward', () => {
		transformTTYWrite('foo\nbar\nbaz');
		transformTTYWrite(ansiEscapes.cursorBackward(2));
		transformTTYWrite('boz');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\nbar\nbboz');
		assert.deepEqual(writes, ['foo\nbar\nbaz', '\x1B[2D', 'boz']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz'],
			['foo\nbar\nbaz', '\x1B[2D', 'boz'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz', 'foo\nbar\nbboz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('insertSpaces', () => {
		transformTTYWrite('foobarbaz');
		transformTTYCursorTo(0);
		transformTTYWrite(moreCodes.insertSpaces(3));

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, '   foobarbaz');
		assert.deepEqual(writes, ['foobarbaz', '\x1B[1G', '\x1B[3@']);
		assert.deepEqual(sequences, [
			['foobarbaz'],
			['foobarbaz', '\x1B[1G', '\x1B[3@'],
		]);
		assert.deepEqual(frames, ['foobarbaz', '   foobarbaz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('deleteCharacters', () => {
		transformTTYWrite('foo  bar     baz');
		transformTTYWrite(ansiEscapes.cursorBackward(3));
		transformTTYWrite(moreCodes.deleteCharacters(3));

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo  bar     ');
		assert.deepEqual(writes, ['foo  bar     baz', '\x1B[3D', '\x1B[3P']);
		assert.deepEqual(sequences, [
			['foo  bar     baz'],
			['foo  bar     baz', '\x1B[3D', '\x1B[3P'],
		]);
		assert.deepEqual(frames, ['foo  bar     baz', 'foo  bar     ']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('overwriteCharacters', () => {
		transformTTYWrite('foo  bar     baz');
		transformTTYWrite(ansiEscapes.cursorBackward(3));
		transformTTYWrite(moreCodes.overwriteCharacters(5));

		const toString = transformTTY.toString();

		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();

		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo  bar          ');
		assert.deepEqual(writes, ['foo  bar     baz', '\x1B[3D', '\x1B[5X']);
		assert.deepEqual(sequences, [
			['foo  bar     baz'],
			['foo  bar     baz', '\x1B[3D', '\x1B[5X'],
		]);
		assert.deepEqual(frames, ['foo  bar     baz', 'foo  bar          ']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString3, 'foo  bar     ');
		assert.deepEqual(frames3, ['foo  bar     baz', 'foo  bar     ']);
	});

	test('insertLines', () => {
		transformTTYWrite('foo');
		transformTTYWrite(moreCodes.insertLines(3));
		transformTTYWrite('bar');

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.equal(toString, 'bar\n\n\nfoo');
		assert.deepEqual(writes, ['foo', '\x1B[3L', 'bar']);
		assert.deepEqual(sequences, [['foo'], ['foo', '\x1B[3L', 'bar']]);
		assert.deepEqual(frames, ['foo', 'bar\n\n\nfoo']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3); // ['foo', 'bar\n\n\nfoo']);
	});

	test('deleteLines', () => {
		transformTTYWrite('foo\nbar\nbaz\nboz');
		transformTTYMoveCursor(0, -2);
		transformTTYWrite(moreCodes.deleteLines(2));

		const toString = transformTTY.toString();
		const toString2 = transformTTY2.toString();
		const toString3 = transformTTY3.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();
		const frames2 = transformTTY2.getFrames();
		const frames3 = transformTTY3.getFrames();

		assert.deepEqual(toString, 'foo\nboz');
		assert.deepEqual(writes, ['foo\nbar\nbaz\nboz', '\x1B[2A', '\x1B[2M']);
		assert.deepEqual(sequences, [
			['foo\nbar\nbaz\nboz'],
			['foo\nbar\nbaz\nboz', '\x1B[2A', '\x1B[2M'],
		]);
		assert.deepEqual(frames, ['foo\nbar\nbaz\nboz', 'foo\nboz']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
		assert.equal(toString2, toString3);
		assert.deepEqual(frames2, frames3);
	});

	test('setTabStop', () => {
		transformTTYCursorTo(10);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(20);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(0);
		transformTTYWrite('\tfoo');
		transformTTYWrite('\tbar');

		const toString = transformTTY.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();

		assert.deepEqual(toString, '          foo       bar');
		assert.deepEqual(writes, [
			'\x1B[11G',
			'\x1BH',
			'\x1B[21G',
			'\x1BH',
			'\x1B[1G',
			'\tfoo',
			'\tbar',
		]);
		assert.deepEqual(sequences, [
			['\x1B[11G', '\x1BH', '\x1B[21G', '\x1BH', '\x1B[1G', '\tfoo'],
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[21G',
				'\x1BH',
				'\x1B[1G',
				'\tfoo',
				'\tbar',
			],
		]);
		assert.deepEqual(frames, ['          foo', '          foo       bar']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
	});
	test('tabForward', () => {
		transformTTYCursorTo(10);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(15);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(0);
		transformTTYWrite(moreCodes.tabForward(), false);
		transformTTYWrite('foo');
		transformTTYWrite(moreCodes.tabForward(), false);
		transformTTYWrite('bar');

		const toString = transformTTY.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();

		assert.deepEqual(toString, '          foo  bar');
		assert.deepEqual(writes, [
			'\x1B[11G',
			'\x1BH',
			'\x1B[16G',
			'\x1BH',
			'\x1B[1G',
			'\x1B[1I',
			'foo',
			'\x1B[1I',
			'bar',
		]);
		assert.deepEqual(sequences, [
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[1G',
				'\x1B[1I',
				'foo',
			],
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[1G',
				'\x1B[1I',
				'foo',
				'\x1B[1I',
				'bar',
			],
		]);
		assert.deepEqual(frames, ['          foo', '          foo  bar']);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
	});

	test('tabBackward', () => {
		transformTTYCursorTo(10);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(15);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(0);
		transformTTYWrite(moreCodes.tabForward(), false);
		transformTTYWrite('foo');
		transformTTYWrite(moreCodes.tabForward(), false);
		transformTTYWrite('bar');
		transformTTYWrite(moreCodes.tabBackward(3), false);
		transformTTYWrite('baz');

		const toString = transformTTY.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();

		assert.deepEqual(toString, '          baz  bar');
		assert.deepEqual(writes, [
			'\x1B[11G',
			'\x1BH',
			'\x1B[16G',
			'\x1BH',
			'\x1B[1G',
			'\x1B[1I',
			'foo',
			'\x1B[1I',
			'bar',
			'\x1B[3Z',
			'baz',
		]);
		assert.deepEqual(sequences, [
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[1G',
				'\x1B[1I',
				'foo',
			],
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[1G',
				'\x1B[1I',
				'foo',
				'\x1B[1I',
				'bar',
			],
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[1G',
				'\x1B[1I',
				'foo',
				'\x1B[1I',
				'bar',
				'\x1B[3Z',
				'baz',
			],
		]);
		assert.deepEqual(frames, [
			'          foo',
			'          foo  bar',
			'          baz  bar',
		]);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
	});

	test('clearTabStop', () => {
		transformTTYCursorTo(10);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(15);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(25);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(0);
		transformTTYWrite('\t\t\tfoo');
		transformTTYWrite(moreCodes.clearTabStop, false);
		transformTTYCursorTo(0);
		transformTTYWrite('\t\t\tbar');

		const toString = transformTTY.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();

		assert.deepEqual(toString, '                bar      foo');
		assert.deepEqual(writes, [
			'\x1B[11G',
			'\x1BH',
			'\x1B[16G',
			'\x1BH',
			'\x1B[26G',
			'\x1BH',
			'\x1B[1G',
			'\t\t\tfoo',
			'\x1B[0g',
			'\x1B[1G',
			'\t\t\tbar',
		]);
		assert.deepEqual(sequences, [
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[26G',
				'\x1BH',
				'\x1B[1G',
				'\t\t\tfoo',
			],
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[26G',
				'\x1BH',
				'\x1B[1G',
				'\t\t\tfoo',
				'\x1B[0g',
				'\x1B[1G',
				'\t\t\tbar',
			],
		]);
		assert.deepEqual(frames, [
			'                         foo',
			'                bar      foo',
		]);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
	});

	test('clearAllTabStops', () => {
		transformTTYCursorTo(10);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(15);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYCursorTo(25);
		transformTTYWrite(moreCodes.setTabStop, false);
		transformTTYWrite('\t\t\tfoo');
		transformTTYCursorTo(0);
		transformTTYWrite(moreCodes.clearAllTabStops, false);
		transformTTYWrite('\t\t\tbar');

		const toString = transformTTY.toString();
		const writes = transformTTY.getWrites();
		const sequences = transformTTY.getSequences();
		const frames = transformTTY.getFrames();

		assert.deepEqual(
			toString,
			'                        bar                     foo'
		);
		assert.deepEqual(writes, [
			'\x1B[11G',
			'\x1BH',
			'\x1B[16G',
			'\x1BH',
			'\x1B[26G',
			'\x1BH',
			'\t\t\tfoo',
			'\x1B[1G',
			'\x1B[3g',
			'\t\t\tbar',
		]);
		assert.deepEqual(sequences, [
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[26G',
				'\x1BH',
				'\t\t\tfoo',
			],
			[
				'\x1B[11G',
				'\x1BH',
				'\x1B[16G',
				'\x1BH',
				'\x1B[26G',
				'\x1BH',
				'\t\t\tfoo',
				'\x1B[1G',
				'\x1B[3g',
				'\t\t\tbar',
			],
		]);
		assert.deepEqual(frames, [
			'                                                foo',
			'                        bar                     foo',
		]);
		assert.equal(toString, frames[frames.length - 1]);
		assert.deepEqual(writes, sequences[sequences.length - 1]);
	});
});
