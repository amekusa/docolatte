/**
 * General purpose utilities
 * @hideconstructor
 * @author amekusa
 */
class Util {
	/**
	 * @param {string} msg
	 * @param {string} name
	 * @return {Error}
	 */
	error(msg, name = '') {
		let r = new Error(msg);
		if (name) r.name = name;
		return r;
	}
	/**
	 * Coerces the given value to an array
	 * @param {any} x
	 * @return {any[]}
	 */
	arr(x) {
		return Array.isArray(x) ? x : [x];
	}
	/**
	 * Coerces the given value to a string
	 * @param {any} x
	 * @return {string}
	 */
	str(x) {
		return x ? ((typeof x == 'string') ? x : `${x}`) : '';
	}
	/**
	 * @param {any} x
	 * @param {object} table
	 * @param {any} [def=undefined] Default value
	 * @return {any}
	 */
	map(x, table, def = undefined) {
		return x in table ? table[x] : (def !== undefined ? def : ('_default' in table ? table._default : x));
	}
	/**
	 * Merges the 2nd object into the 1st object recursively (deep-merge). The 1st object will be modified.
	 * @param {object} x The 1st object
	 * @param {object} y The 2nd object
	 * @param {number} recurse=8 Recurstion limit
	 * @return {object} The 1st object
	 */
	merge(x, y, recurse = 8) {
		if (recurse && x && y && typeof x == 'object' && typeof y == 'object' && !Array.isArray(x) && !Array.isArray(y)) {
			for (let key in y) x[key] = $.merge(x[key], y[key], recurse - 1);
		} else return y;
		return x;
	}
	/**
	 * @param {string} file
	 * @return {string}
	 */
	ext(file) {
		file = $.splitLast(file, '?')[0];
		let dot = file.lastIndexOf('.');
		return dot < 0 ? '' : file.substring(dot + 1).toLowerCase();
	}
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
	}
	/**
	 * Splits a string at the last occurence of the given separator
	 * @param {string} str
	 * @param {string} sep
	 * @return {string[]}
	 */
	splitLast(str, sep) {
		let pos = str.lastIndexOf(sep);
		return pos < 0 ? [ str, '' ] : [ str.substring(0, pos), str.substring(pos) ];
	}
	/**
	 * Splits the given string into words, numbers and symbols.
	 * @param {string} str
	 * @param {object} [opts]
	 * @return {string[]}
	 */
	splitWords(str, opts = {}) {
		let r = [];
		let chars = [...str];
		let { minLength = 2, maxLength } = opts;
		let curr = {
			buff: '',
			type: -1,
		};
		for (let i = 0; i < chars.length; i++) {
			let char = chars[i];
			let split = false;
			let type = 0;
			for (; type < priv.charTypes.length; type++) {
				if (char.match(priv.charTypes[type])) {
					if (type != curr.type) {
						if (curr.type >= 0) split = true;
						curr.type = type;
					}
					break;
				}
			}
			if (
				(split && (!minLength || curr.buff.length >= minLength)) ||
				(maxLength && char.length + curr.buff.length > maxLength)
			) {
				r.push(curr.buff);
				curr.buff = '';
			}
			curr.buff += char;
		}
		if (curr.buff) r.push(curr.buff);
		return r;
	}
	/**
	 * Converts the given value into a literal string.
	 * @param {any} x - Any type of value
	 * @return {string} Literal string
	 */
	toLiteral(x) {
		switch (typeof x) {
		 case 'undefined': return 'undefined';
		 case 'string': return `"${x}"`;
		 case 'boolean': return x ? 'true' : 'false';
		 case 'object':
			if (x === null) return 'null';
			if (Array.isArray(x)) return '[' + x.map(i => $.toLiteral(i)).join(',') + ']';
			return '{' + Object.keys(x).map(k => `"${k}":${$.toLiteral(x[k])}`).join(',') + '}';
		}
		return `${x}`;
	}
	/**
	 * Escapes regex's special characters in the given string.
	 * @param {string} str
	 * @return {string} Modified `str`
	 * @see https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
	 */
	escRegExp(str) {
		return str.replace(priv.escRegExp, '\\$&');
	}
}

// Private vars
const priv = {
	escRegExp: /[/\-\\^$*+?.()|[\]{}]/g,
	charTypes: [
		/[a-z]/,
		/[A-Z]/,
		/[0-9]/,
		/[\/.#$~_-]/
	],
};

const $ = new Util();
module.exports = $;