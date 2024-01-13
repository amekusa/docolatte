/**
 * Exception thrower.
 * @author amekusa
 */
class Exception {
	/**
	 * @param {string} label - Log label
	 */
	constructor(label) {
		this.label = label;
	}
	/**
	 * Generates a new exception instance.
	 * @param {string} msg - Message
	 * @param {any} [info] - Additional info
	 */
	new(msg, info = null) {
		return new ExceptionInfo(this.label, msg, info);
	}
	/**
	 * Throws an exception.
	 * @param {...any} args - Same as {@link Exception#new}
	 */
	throw(...args) {
		throw this.new(...args);
	}
	/**
	 * Logs an exception to console as an error.
	 * @param {...any} args - Same as {@link Exception#new}
	 */
	error(...args) {
		console.error(this.new(...args));
	}
	/**
	 * Logs an exception to console as an error, and returns the given value.
	 * @param {any} x - Return value
	 * @param {...any} args - Same as {@link Exception#new}
	 * @return {any} `x`
	 */
	withError(x, ...args) {
		this.error(...args);
		return x;
	}
	/**
	 * Logs an exception to console as a warning.
	 * @param {...any} args - Same as {@link Exception#new}
	 */
	warn(...args) {
		console.warn(this.new(...args));
	}
	/**
	 * Logs an exception to console as a warning, and returns the given value.
	 * @param {any} x - Return value
	 * @param {...any} args - Same as {@link Exception#new}
	 * @return {any} `x`
	 */
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
