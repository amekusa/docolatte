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
	 * @param {string} file
	 * @return {object}
	 */
	splitExt(file) {
		let dot = file.lastIndexOf('.');
		if (dot < 0) return { name: file, ext: '' };
		let r = {};
		r.name = file.substring(0, dot);
		r.ext = file.substring(dot);
		return r;
	},

};

module.exports = $;