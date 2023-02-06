/**
 * General purpose utilities
 * @author amekusa
 */
const $ = {

	/**
	 * @param {string} msg
	 * @param {string} name
	 * @return {Error}
	 */
	error(msg, name = '') {
		let r = new Error(msg);
		if (name) r.name = name;
		return r;
	},

	/**
	 * Forces the given value to be an array
	 * @param {any} x
	 * @return {any[]}
	 */
	arr(x) {
		return Array.isArray(x) ? x : [x];
	},

	/**
	 * Merges 2 objects recursively
	 * @return {object}
	 * @author amekusa
	 */
	merge(x, y) {
		if (typeof x != 'object' || typeof y != 'object') return y;

		if (Array.isArray(x)) return Array.isArray(y) ? x.concat(y) : y;
		if (Array.isArray(y)) return y;

		var r = {};
		for (var i in x) r[i] = (i in y) ? $.merge(x[i], y[i]) : x[i];
		for (var i in y) {
			if (!(i in x)) r[i] = y[i];
		}
		return r;
	}
};

module.exports = $;