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
	 * @param {any} x
	 * @param {object} table
	 * @param {any} [def=undefined] Default value
	 * @return {any}
	 */
	map(x, table, def = undefined) {
		return x in table ? table[x] : (def !== undefined ? def : ('_default' in table ? table._default : x));
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
	},

	/**
	 * @param {string} file
	 * @return {string}
	 */
	ext(file) {
		let dot = file.lastIndexOf('.');
		return dot < 0 ? '' : file.substring(dot + 1).toLowerCase();
	},

	/**
	 * Splits a string at the first occurence of the given separator
	 * @param {string} str
	 * @param {string} sep
	 * @return {string[]}
	 */
	splitFirst(str, sep) {
		let pos = str.indexOf(sep);
		if (pos < 0) return [ '', str ];
		pos += sep.length;
		return [ str.substring(0, pos), str.substring(pos) ];
	},

	/**
	 * Splits a string at the last occurence of the given separator
	 * @param {string} str
	 * @param {string} sep
	 * @return {string[]}
	 */
	splitLast(str, sep) {
		let pos = str.lastIndexOf(sep);
		return pos < 0 ? [ str, '' ] : [ str.substring(0, pos), str.substring(pos) ];
	},

};

module.exports = $;