/**
 * Debugging Utility
 */
class Debugger {
	constructor(label = '[DEBUG]', enabled = true) {
		this.label = label;
		this.enabled = enabled;
	}
	enable() {
		this.enabled = true;
		return this;
	}
	disable() {
		this.enabled = false;
		return this;
	}
	log(...args) {
		if (!this.enabled) return false;
		return console.debug(this.label, ...args);
	}
	call(fn, ...args) {
		if (!this.enabled) return false;
		return fn(...args);
	}
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
