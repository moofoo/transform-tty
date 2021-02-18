const Terminal = require('terminal.js');

class TerminalJSParser {
	constructor(options = {}) {
		options = {
			rows: options.rows || 20,
			columns: options.columns || 80,
			...options,
		};

		options.crlf = options.crlf === undefined ? true : options.crlf;

		this.options = options;

		this.terminal = new Terminal(options);

		if (options.crlf) {
			this.terminal.state.setMode('crlf', true);
		}
	}

	write(input) {
		this.terminal.write(input);
		return this;
	}

	toString(trailing = '') {
		return this.terminal.toString().replace(/\n+$/, '') + trailing;
	}

	clear() {
		this.terminal = new Terminal(this.options);
		if (this.options.crlf) {
			this.terminal.state.setMode('crlf', true);
		}
		return this;
	}

	resize(rows, columns) {
		this.options = {
			...this.options,
			rows,
			columns,
		};

		this.terminal.state.resize({ rows, columns });
		return this;
	}

	cursorGetPosition() {
		return [this.terminal.state.cursor.x, this.terminal.state.cursor.y];
	}

	new() {
		return new TerminalJSParser(this.options);
	}
}

module.exports = TerminalJSParser;
