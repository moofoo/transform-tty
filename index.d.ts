import TTY from 'tty';

declare interface Sequencer {
	currentSequence: string[];
	lastSequence: string[];
	sequences: string[][];
}

declare interface TransformTTYOptions {
	rows?: number;
	columns?: number;
	defaultParser?: 'terminalJS' | 'ansiTerminal';
	crlf?: false;
	[key: any]: number | string | boolean;
}

declare class TransformTTY extends TTY.WriteStream {
	constructor(options?: TransformTTYOptions);

	addSequencer(
		add?: (string: string, sequencer: Sequencer) => boolean,
		clear?: (string: string, sequencer: Sequencer) => boolean
	): void;

	getFrames(): string[];

	getSequences(): string[][];

	getWrites(): string[];

	toString(): string;

	static onlyAnsi(string: string): boolean;
}

export = TransformTTY;
