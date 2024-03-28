/**
 * General purpose utilities
 * @hideconstructor
 * @author Satoshi Soma (amekusa.com)
 * @license Apache-2.0
 * Copyright 2020 Satoshi Soma
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
	 * Clones the given object (deep-clone). The given object won't be modified.
	 * @param {object} x - Object to clone
	 * @return {object} Cloned object
	 */
	clone(x) {
		if (typeof x == 'object') {
			if (Array.isArray(x)) {
				let r = [];
				for (let i = 0; i < x.length; i++) r.push($.clone(x[i]));
				return r;
			} else {
				let r = {};
				for (let k in x) r[k] = $.clone(x[k]);
				return r;
			}
		}
		return x;
	}
	/**
	 * Converts base of the given integer.
	 * @param {number} int
	 * @param {string} digits - Digits to use
	 * @return {string}
	 */
	base(int, digits) {
		let r = '';
		let neg;
		if (int < 0) {
			int *= -1;
			neg = true;
		}
		let base = digits.length;
		let _int;
		do {
			_int = ~~(int / base);                      // NOTE: Same as `Math.floor(int / base)`
			r = digits.charAt(int - (_int * base)) + r; // NOTE: Same as `digits.charAt(int % base)`;
			int = _int;
		} while (int > 0);
		return neg ? ('-' + r) : r;
	}
	/**
	 * Returns a unique integer number.
	 * @return {number}
	 */
	unique() {
		priv.unique++;
		return priv.unique;
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
		let buff = '';
		let currType = -1;
		for (let i = 0; i < chars.length; i++) {
			let char = chars[i];
			let split = false;
			for (let type = 0; type < priv.charTypes.length; type++) {
				if (char.match(priv.charTypes[type])) {
					if (type != currType) {
						if (currType >= 0) {
							if (currType == 1 && type == 0); // prev: uppercase, curr: lowercase
							else split = true;
						}
						currType = type;
					}
					break;
				}
			}
			if (
				(split && (!minLength || buff.length >= minLength)) ||
				(maxLength && char.length + buff.length > maxLength)
			) {
				r.push(buff);
				buff = '';
			}
			buff += char;
		}
		if (buff) r.push(buff);
		return r;
	}
	/**
	 * Converts the given value into a literal string.
	 * @param {any} x - Value to convert
	 * @param {object} [opts] - Options
	 * @param {string} opts.quote='"' - Quotation char for string values
	 * @param {boolean} opts.quoteKeys=true - Whether to quote object keys
	 * @return {string} Literal string
	 */
	toLiteral(x, opts = {}) {
		let { quote = '"', quoteKeys = true } = opts;
		switch (typeof x) {
		 case 'undefined': return 'undefined';
		 case 'string':    return quote + x.replaceAll(quote, `\\${quote}`) + quote;
		 case 'boolean':   return x ? 'true' : 'false';
		 case 'number':    return '' + x;
		 case 'object':
			if (x === null) return 'null';
			if (Array.isArray(x)) return '[' + x.map(i => $.toLiteral(i, opts)).join(',') + ']';
			return '{' +
				Object.keys(x).map(k => {
					let v = $.toLiteral(x[k], opts);
					if (quoteKeys && typeof k == 'string')
						k = quote + k.replaceAll(quote, `\\${quote}`) + quote;
					return k + ':' + v;
				}).join(',') +
			'}';
		}
		throw `unsupported type: ${typeof x}`;
	}
	/**
	 * Escapes regex's special characters in the given string.
	 * @param {string} str
	 * @return {string} Modified `str`
	 * @see https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
	 */
	escRegExp(str) {
		return str.replaceAll(priv.regexSymbols, '\\$&');
	}
}

// Private vars
const priv = {
	unique: 0,
	regexSymbols: /[/\-\\^$*+?.()|[\]{}]/g,
	charTypes: [
		/* do NOT change the order */
		/[a-z]/,
		/[A-Z]/,
		/[0-9]/,
		/\s/,
		/[\/.#$~_-]/,
	],
};

const $ = new Util();
module.exports = $;