# TransformTTY

TransformTTY is a Transform stream that mimics the interface of `tty.WriteStream` and can function as a drop-in replacement wherever standard output streams (stdout / stderr) are used. It converts writes to strings via terminal emulation provided by [Terminal.JS](http://terminal.js.org). TransformTTY is primarily a means to test CLI rendering/clearing routines that use the `clearLine`, `moveCursor`, and `cursorTo` methods (i.e. for CLI animation)

## Install

```
$ npm install transform-tty
```

### Usage
```js
const TransformTTY = require('transform-tty');

const transformTTY = new TransformTTY({rows:20, columns:40});

transformTTY.addSequencer();
transformTTY.write('foo');
transformTTY.cursorTo(5);
transformTTY.write('bar');

const string = transformTTY.toString();
const writes = transformTTY.getWrites();
const sequences = transformTTY.getSequences();
const frames = transformTTY.getFrames();

// string = 'foo  bar'
// writes = [ 'foo', '\x1B[6G', 'bar' ]
// sequences = [ [ 'foo' ], [ 'foo', '\x1B[6G', 'bar' ] ]
// frames = [ 'foo', 'foo  bar' ]
```
## API

### addSequencer(add, clear)

A 'sequencer' breaks up writes to the stream into sequences based on the `add` and `clear` functions.

Both  `add` and `clear` have useful defaults that will very likely meet your needs, if you want to test console output that clears lines/the screen and moves the cursor. See the 'Sequences' section

### toString()

```js
const transformTTY = new TransformTTY();

transformTTY.write('foo');
transformTTY.moveCursor(0, 3);
transformTTY.write('bar');
transformTTY.moveCursor(0, 3);
transformTTY.write('baz');

transformTTY.toString() // 'foo   bar   baz'
```

### getWrites()
```js
const transformTTY = new TransformTTY();

transformTTY.write('foo');
transformTTY.moveCursor(0, 3);
transformTTY.write('bar');
transformTTY.moveCursor(0, 3);
transformTTY.write('baz');

transformTTY.getWrites() // [ 'foo', '\x1B[3C', 'bar', '\x1B[3C', 'baz' ]
```

### getSequences()
```js
const transformTTY = new TransformTTY();
transformTTY.addSequencer();

transformTTY.write('foo');
transformTTY.moveCursor(0, 3);
transformTTY.write('bar');
transformTTY.moveCursor(0, 3);
transformTTY.write('baz');

transformTTY.getSequences()
/*
[
  [ 'foo' ],
  [ 'foo', '\x1B[3C', 'bar' ],
  [ 'foo', '\x1B[3C', 'bar', '\x1B[3C', 'baz' ]
]
*/
```

### getFrames()
```js
const transformTTY = new TransformTTY();
transformTTY.addSequencer();

transformTTY.write('foo');
transformTTY.moveCursor(0, 3);
transformTTY.write('bar');
transformTTY.moveCursor(0, 3);
transformTTY.write('baz');

transformTTY.getFrames() // [ 'foo', 'foo   bar', 'foo   bar   baz' ]
```

## Sequences

### TLDR version:

If you want to test if calls to clearLine / clearScreenDown are fully clearing output as you intend, do this:

```js
const transformTTY = new TransformTTY();
const transformTTY.addSequencer();
const transformTTY.addSequencer(null, true);

//do somes writes and calls to tty methods (clearLine, moveCursor, etc)...

const [frames1, frames2] = transformTTY.getFrames();

assert.deepEqual(frames1, frames2);
```

### Long version:

When talking about CLI animation, you don't really have 'frames', technically speaking. What you see with a console 'spinner', for example,
is just a repeated series of text output and control codes that manage cursor behavior to output the text, clear the line(s) of output, and reposition itself before repeating the series.

We can approximate frames by breaking up these outputs into sequences by some logic and then running the sequences individually through a terminal emulator to create strings.

With no arguments for `add` or `clear`, addSequencer creates sequences on text output (that is, when output isn't exclusively control codes). It does NOT clear
between sequences (the default of `clear` is `false`), so sequences are additive by default.


```js
const transformTTY = new TransformTTY();
transformTTY.addSequencer();

/*
transformTTY.addSequencer() same as:

transformTTY.addSequencer(
    (string) => !TransformTTY.onlyAnsi(string),
    false
);

Adds a new sequence when string contains text
*/

transformTTY.write('foo');

transformTTY.clearLine();

transformTTY.cursorTo(5);

transformTTY.write('bar');

const sequences = transformTTY.getSequences();
const frames = transformTTY.getFrames();

//sequences = [ [ 'foo' ], [ 'foo', '\x1B[2K', '\x1B[6G', 'bar' ] ]
//frames = [ 'foo', '     bar' ]
```

Passing `true` for `clear` clears between sequences when the current sequence contains any clearLine or clearScreen codes (sequences are still created on text output, in this example). It simulates the 'ideal case' for console clearing, in other words.

```js
const transformTTY = new TransformTTY();
transformTTY.addSequencer();
transformTTY.addSequencer(null, true) //  (passing `null` for `add` uses the default behavior)

/*
transformTTY.addSequencer(null, true)  same as:

transformTTY.addSequencer(
    (string) => !TransformTTY.onlyAnsi(string),
    (string, sequencer) => {
        return sequencer.currentSequence.find(string => {
            return RegExp('\\x1b\\[[0-2]?K|\\x1b\\[[0-2]?J').test(string);
        });
    }
);
*/

transformTTY.write('foo');

transformTTY.cursorTo(5);

transformTTY.write('bar');

transformTTY.clearLine(0);

transformTTY.cursorTo(0);

transformTTY.write('baz');

const [sequences, clearedSequences] = transformTTY.getSequences();
const [frames, clearedFrames] = transformTTY.getFrames();

/*
frames and clearedFrames = [ 'foo', 'foo  bar', 'baz' ]

sequences =
[
  [ 'foo' ],
  [ 'foo', '\x1B[6G', 'bar' ],
  [ 'foo', '\x1B[6G', 'bar', '\x1B[2K', '\x1B[1G', 'baz' ]
]

clearedSequences = [ [ 'foo' ], [ 'foo', '\x1B[6G', 'bar' ], [ '\x1B[1G', 'baz' ] ]
*/
```

Now watch what happens if we change the call to clearLine so its ineffective:

```js
const transformTTY = new TransformTTY();
transformTTY.addSequencer();
transformTTY.addSequencer(null, true)

transformTTY.write('foo');

transformTTY.cursorTo(5);

transformTTY.write('bar');

transformTTY.clearLine(1); //This clears to the right of the cursor, instead of the whole line

transformTTY.cursorTo(0);

transformTTY.write('baz');

const [frames, clearedFrames] = transformTTY.getFrames();

// frames =         [ 'foo', 'foo  bar', 'baz  bar' ]
// clearedFrames =  [ 'foo', 'foo  bar', 'baz' ]

```

`frames` has changed to reflect the `clearLine(1)` call, but `clearedFrames` is the same as when `clearLine(0)` was used. Again, this is because the sequences you get with `transformTTY.addSequencer(null, true)` represent the ideal case for all clearing control codes, assuming the intent is to completely clear the output.

Actual rendering / clearing algorithms are more complex than this, of course. I've made an example Spinner app with tests to show how TransformTTY could be used in a more realistic situation:[spinner.text.js](https://github.com/moofoo/transform-tty/blob/main/tests/spinner.test.js)


