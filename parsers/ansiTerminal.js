var AnsiTerminal = require('node-ansiterminal').AnsiTerminal;
var AnsiParser = require('node-ansiparser');

class NodeAnsiTerminal {
	constructor(options = {}) {
		options = {
			rows: options.rows || 20,
			columns: options.columns || 80,
			scrollbuffer: 500 || options.scrollbuffer,
			...options,
		};

		options.newline_mode =
			options.newline_mode === undefined ? false : options.newline_mode;

		this.options = options;

		this.terminal = new AnsiTerminal(
			this.options.columns,
			this.options.rows,
			this.options.scrollbuffer
		);
		this.parser = new AnsiParser(this.terminal);

		this.terminal.newline_mode = this.options.newline_mode;
	}

	write(input) {
		this.parser.parse(input);
		return this;
	}

	toString(trailing = '') {
		return this.terminal.toString().replace(/\n+$/, '') + trailing;
	}

	clear() {
		this.terminal = new AnsiTerminal(
			this.options.columns,
			this.options.rows,
			this.options.scrollbuffer
		);

		this.terminal.newline_mode = this.options.newline_mode;

		this.parser = new AnsiParser(this.terminal);

		return this;
	}

	resize(rows, columns) {
		this.options = {
			...this.options,
			rows,
			columns,
		};

		this.terminal.resize(columns, rows);
		return this;
	}

	cursorGetPosition() {
		return [this.terminal.cursor.col, this.terminal.cursor.row];
	}

	new() {
		return new NodeAnsiTerminal(this.options);
	}
}

module.exports = NodeAnsiTerminal;
