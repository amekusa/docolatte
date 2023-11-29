class Exception {
	constructor(label) {
		this.label = label;
	}
	new(msg, info = null) {
		return new ExceptionInfo(this.label, msg, info);
	}
	throw(...args) {
		throw this.new(...args);
	}
	error(...args) {
		console.error(this.new(...args));
	}
	withError(x, ...args) {
		this.error(...args);
		return x;
	}
	warn(...args) {
		console.warn(this.new(...args));
	}
	withWarn(x, ...args) {
		this.warn(...args);
		return x;
	}
}

class ExceptionInfo extends Error {
	constructor(label, msg, info = undefined) {
		super(`${label} ${msg}` + (info === undefined ? '' : `\n:: info: ${info}`));
		this.info = info;
	}
}

export default Exception;
