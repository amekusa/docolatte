/**
 * Provides hook mechanics.
 * @author amekusa
 */
class Hooks {
	/**
	 * @param {object} [opts]
	 * @param {string|boolean} [opts.only=false]
	 * - `'first'`: Only allows 1 function per hook
	 * - `'last'`: Only invokes the last function added
	 * - `false`: Accepts any number of functions (default)
	 */
	constructor(opts = {}) {
		this.only = opts.only || false;
		this.reg = {};
	}
	/**
	 * Adds hook function(s).
	 * @param {object} hooks - Key = hook name, Value = function
	 */
	add(hooks) {
		for (let k in hooks) {
			if (!(k in this.reg)) this.reg[k] = [];
			this.reg[k].push(hooks[k]);
		}
	}
	/**
	 * Invokes the hook functions associated with the given key.
	 * @param {string} key
	 * @param {...any} [args] - Args to pass to the functions
	 */
	do(key, ...args) {
		if (!this.has(key)) return;
		switch (this.only) {
			case 'first': this.reg[key][0](...args); break;
			case 'last':  this.reg[key][this.reg[key].length - 1](...args); break;
			default:      for (let i = 0; i < this.reg[key].length; i++) this.reg[key][i](...args);
		}
	}
	/**
	 * Modifies the given value with the hook functions associated with the given key.
	 * @param {string} key
	 * @param {any} value - Value to pass to the functions
	 * @param {...any} [args] - Additional args to pass to the functions
	 * @return {any} Modified `value`
	 */
	apply(key, value = undefined, ...args) {
		if (!this.has(key)) return value;
		switch (this.only) {
			case 'first': value = this.reg[key][0](value, ...args); break;
			case 'last':  value = this.reg[key][this.reg[key].length - 1](value, ...args); break;
			default:      for (let i = 0; i < this.reg[key].length; i++) value = this.reg[key][i](value, ...args);
		}
		return value;
	}
	/**
	 * Returns whether any hook function associated with the given key exists.
	 * @param {string} key
	 * @return {boolean}
	 */
	has(key) {
		return this.reg[key] && (this.reg[key].length > 0);
	}
}

module.exports = Hooks;