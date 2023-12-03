/**
 * Debug utility.
 * @author amekusa
 */
class Debugger {
	/**
	 * @param {string} [label] - Log label
	 * @param {boolean} [enabled] - Whether to enable debugging
	 */
	constructor(label = '[DEBUG]', enabled = true) {
		this.label = label;
		this.enabled = enabled;
	}
	/**
	 * Enables debugging.
	 */
	enable() {
		this.enabled = true;
	}
	/**
	 * Disables debugging.
	 */
	disable() {
		this.enabled = false;
	}
	/**
	 * Outputs logs to console.
	 * @param {...any} args - Infos to log
	 */
	log(...args) {
		if (!this.enabled) return false;
		return console.debug(this.label, ...args);
	}
	/**
	 * Calls the given function.
	 * @param {function} fn - Function to call
	 * @param {...any} args - Arguments to pass to `fn`
	 * @return {any} Return of `fn`
	 */
	call(fn, ...args) {
		if (!this.enabled) return false;
		return fn(...args);
	}
	/**
	 * Simulates a heavy computing operation.
	 * @param {number} weight - How heavy
	 */
	slow(weight) {
		if (!this.enabled) return false;
		console.time(this.label + ' slow');
		let r = 0;
		for (let i = Math.pow(weight, 7); i >= 0; i--) r += Math.atan(i) * Math.tan(i);
		console.timeEnd(this.label + ' slow');
		return r;
	}
}

export default Debugger;
