const { suite, setup, test } = require('mocha');
const assert = require('assert').strict;
const TransformTTY = require('..');
const WormSpinner = require('./spinner');

const runTests = (transformTTY, output, log) => {
	const [frames, clearedFrames] = transformTTY.getFrames();
	const [sequences, clearedSequences] = transformTTY.getSequences();
	const [string, clearedString] = transformTTY.getSequenceStrings();

	if (log) {
		console.log('FRAMES', frames);
		console.log('\nCLEARED FRAMES', clearedFrames);

		console.log('\nSEQUENCES', sequences);
		console.log('\nCLEARED SEQUENCES', clearedSequences);
	}

	assert.equal(string, output);
	assert.strictEqual(string, clearedString);
	assert.equal(frames[frames.length - 1], string);
	assert.deepEqual(frames, clearedFrames);
};

let spinner;

const renderBasic = (spinner, log) => {
	spinner.render();
	/*
        Output: > - foo
    */

	spinner.text = 'bar';
	spinner.indent = 5;
	spinner.render();
	/*
        Output: >      ~ bar
    */

	runTests(spinner.stream, '     ~ bar', log);
};

const renderWhiteSpaceAndMultipleLines = (spinner, log) => {
	spinner.stream.columns = 20;

	spinner.render();
	/* Output: - foo

        > - foo
    */

	spinner.text =
		'\n foo \n' + '0'.repeat(spinner.stream.columns + 5) + ' bar \n baz ';
	spinner.render();
	/* Output: ~ \n foo \n0000000000\n00000 bar \n baz

        > ~
        >  foo
        > 0000000000
        > 00000 bar
        >  baz
    */

	spinner.text = 'foo\nbar\n ';
	spinner.render();
	/* Output: - foo\nbar\n

        > - foo
        > bar
        >
    */

	spinner.text = '0'.repeat(spinner.stream.columns + 5);
	spinner.render();
	/* Output: ~ 00000000000000000000000000000000000000\n0000000

        > ~ 00000000000000000000000000000000000000
        > 0000000
   */

	// spinner.stream.columns = 25;

	spinner.text = '🦄'.repeat(spinner.stream.columns + 5);
	spinner.render();
	/* Output: - 🦄🦄🦄🦄🦄🦄🦄🦄🦄\n🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄\n🦄🦄🦄🦄🦄🦄

        > - 🦄🦄🦄🦄🦄🦄🦄🦄🦄
        > 🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄
        > 🦄🦄🦄🦄🦄🦄
   */

	spinner.text = '🦄'.repeat(spinner.stream.columns - 2) + '\nfoo';
	spinner.render();
	/* Output: ~ 🦄🦄🦄🦄🦄🦄🦄🦄🦄\n🦄🦄🦄🦄🦄🦄🦄🦄🦄\nfoo

        > ~ 🦄🦄🦄🦄🦄🦄🦄🦄🦄
        > 🦄🦄🦄🦄🦄🦄🦄🦄🦄
        > foo
   */

	spinner.indent = 10;
	spinner.render();

	/* Output:          - 🦄🦄🦄🦄\n🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄\n🦄🦄🦄🦄\nfoo

        >           - 🦄🦄🦄🦄
        > 🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄
        > 🦄🦄🦄🦄
        > foo
   */

	runTests(
		spinner.stream,
		'          - 🦄🦄🦄🦄\n🦄🦄🦄🦄🦄🦄🦄🦄🦄🦄\n🦄🦄🦄🦄\nfoo',
		log
	);
};

const renderIndent = (spinner, log) => {
	spinner.stream.columns = 15;

	spinner.render();
	/* Output: - foo

         > - foo
     */

	spinner.text = '0'.repeat(spinner.stream.columns - 5);
	spinner.render();
	/* Output: ~ 0000000000'

         > ~ 0000000000
     */

	spinner.indent = 10;
	spinner.render();
	/* Output:           - 000\n0000000'

         >           - 000
         > 0000000
     */

	spinner.text = 'foobarbaz';
	spinner.indent = 2;
	spinner.render();
	/* Output:   ~ foobarbaz

        >   ~ foobarbaz
    */

	spinner.text = 'foobar';
	spinner.indent = 3;
	spinner.render();
	/*  Output: >    - foobar

        >    - foobar

    */

	spinner.text = 'foo';
	spinner.indent = spinner.stream.columns;
	spinner.render();
	/* Output >                \n~ foo

        >
        > ~ foo
    */

	runTests(spinner.stream, '               \n~ foo', log);
};

const animatedStartAndStop = async (spinner) => {
	const delay = (time) => {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve();
			}, time);
		});
	};

	spinner.doTheWorm();

	await delay(500);

	spinner.text = 'foobar';

	await delay(500);

	spinner.pleaseStopDoingTheWorm();

	spinner.text = 'foo';
	spinner.indent = 5;

	spinner.doTheWorm();

	await delay(500);

	spinner.pleaseStopDoingTheWorm();

	runTests(spinner.stream, '');
};

suite('Spinner render testing', () => {
	let spinner;

	let transformTTY;

	setup(() => {
		transformTTY = new TransformTTY({ crlf: true });
		transformTTY.addSequencer();
		transformTTY.addSequencer(null, true);

		spinner = new WormSpinner({
			text: 'foo',
			stream: transformTTY,
		});
	});

	test('render, basic', () => {
		renderBasic(spinner);
	});

	test('optimizedRender, basic', () => {
		spinner.useOptimizedRender = true;
		renderBasic(spinner);
	});

	test('render, whitespace and multiple lines', () => {
		renderWhiteSpaceAndMultipleLines(spinner);
	});

	test('optimizedRender, whitespace and multiple lines', () => {
		spinner.useOptimizedRender = true;
		renderWhiteSpaceAndMultipleLines(spinner);
	});

	test('render, indent', () => {
		renderIndent(spinner);
	});

	test('optimizedRender, indent', () => {
		spinner.useOptimizedRender = true;
		renderIndent(spinner);
	});

	test('render, starting and stopping animation', async function () {
		this.timeout(0);
		await animatedStartAndStop(spinner);
	});

	test('optimizedRender, starting and stopping animation', async function () {
		spinner.useOptimizedRender = true;

		this.timeout(0);
		await animatedStartAndStop(spinner);
	});
});

/*
    When 'frames' !== 'clearedFrames' (deep equality), it indicates that the spinner.clear method
    has failed to fully erase console output between successive calls to spinner.render.
*/

suite('Spinner with bad clear method', () => {
	let transformTTY;

	setup(() => {
		transformTTY = new TransformTTY({ crlf: true });
		transformTTY.addSequencer();
		transformTTY.addSequencer(null, true);

		spinner = new WormSpinner({
			text: 'foo',
			stream: transformTTY,
		});
	});

	test('badRender, basic', () => {
		spinner.stream.log = true;

		spinner.badRender();
		/*
            Output:
                > - foo
        */

		spinner.text = 'bar';
		spinner.indent = 5;
		spinner.badRender();
		/*
            actual output (from frames):
                > - foo~ bar

            ideal output (from clearedFrames):
                >      ~ bar
        */

		const [string, clearedString] = transformTTY.getSequenceStrings();
		const [frames, clearedFrames] = transformTTY.getFrames();

		assert.equal(string, '- foo~ bar');
		assert.equal(clearedString, '     ~ bar');

		assert.notDeepEqual(frames, clearedFrames);
	});

	test('badRender, whitespace and multiple lines', () => {
		spinner.stream.columns = 15;

		spinner.badRender();
		/*
            Output:
                > - foo
        */

		spinner.text =
			' foo \n' +
			'0'.repeat(spinner.stream.columns + 5) +
			'\n bar \n baz ';
		spinner.indent = 5;
		spinner.badRender();
		/*
            actual output: - foo~  foo \n000000000000000\n00000\n bar \n baz

                > - foo~  foo
                > 000000000000000
                > 00000
                >  bar
                >  baz

            ideal output:      ~  foo \n000000000000000\n00000\n bar \n baz

                >      ~  foo
                > 000000000000000
                > 00000
                >  bar
                >  baz
        */

		spinner.indent = 0;
		spinner.text = 'foo\nbar\n ';
		spinner.badRender();
		/*
            actual output: - foo~  foo \n000000000000000\n00000\n bar \n- foo\nbar\n

                > - foo~  foo
                > 000000000000000
                > 00000
                >  bar
                > - foo
                > bar
                >

            ideal output: - foo\nbar\n

                > - foo
                > bar
                >
        */

		const [string, clearedString] = transformTTY.getSequenceStrings();
		const [frames, clearedFrames] = transformTTY.getFrames();

		assert.equal(
			string,
			'- foo~  foo \n000000000000000\n00000\n bar \n- foo\nbar\n '
		);
		assert.equal(clearedString, '- foo\nbar\n ');

		assert.notDeepEqual(frames, clearedFrames);
	});

	test('badRender, indent', () => {
		spinner.stream.columns = 15;

		spinner.badRender();
		/*
            Output:
                > - foo
        */

		spinner.text = '1'.repeat(spinner.stream.columns + 10);
		spinner.indent = 5;
		spinner.badRender();
		/*
            actual output: - foo~ 11111111\n111111111111111\n11

                > - foo~ 11111111
                > 111111111111111
                > 11

            ideal output: ~ 11111111\n111111111111111\n11

                >      ~ 11111111
                > 111111111111111
                > 11
        */

		spinner.text = '0'.repeat(spinner.stream.columns - 5);
		spinner.indent = 10;
		spinner.badRender();
		/*
            actual output: - foo~ 11111111\n111111111111111\n11        - 000\n0000000

                > - foo~ 11111111
                > 111111111111111
                > 11        - 000
                > 0000000

            ideal output:           - 000\n0000000

                >           - 000
                > 0000000
        */

		const [string, clearedString] = transformTTY.getSequenceStrings();
		const [frames, clearedFrames] = transformTTY.getFrames();

		assert.equal(
			string,
			'- foo~ 11111111\n111111111111111\n11        - 000\n0000000'
		);
		assert.equal(clearedString, '          - 000\n0000000');

		assert.notDeepEqual(frames, clearedFrames);
	});
});
