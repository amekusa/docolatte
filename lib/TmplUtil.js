const feather = require('feather-icons');
const icons = require('./icons');

/**
 * Template utility.
 * @author amekusa
 */
class TmplUtil {
	/**
	 * Outputs an HTML tag with the given name and attributes.
	 * @param {string} name - Tag name
	 * @param {object|string} [attrs] - Attributes
	 * @return {string} HTML
	 * @example
	 * const $ = require('TmplUtil');
	 * $.tag('link', {
	 *   type: 'text/css',
	 *   rel:  'stylesheet',
	 *   href: 'style.css'
	 * });
	 */
	tag(name, attrs = null) {
		return `<${name + this.attrs(attrs)}>`;
	}
	/**
	 * Composes HTML an element with the given arguments.
	 * @param {string} name - Tag name
	 * @param {object|string} [attrs] - Attributes. Requires the number of args to be 3
	 * @param {string} [content] - Content of the element
	 * @return {string} HTML
	 * @example <caption>Composing a simple anchor element</caption>
	 * const $ = require('TmplUtil');
	 * let html = $.elem(
	 *   'a', {
	 *     href:  'https://example.com',
	 *     title: 'Example Site'
	 *   },
	 *   'See example'
	 * );
	 */
	elem(name, ...args) {
		let r = `<${name}`;
		switch (args.length) {
		 case 0:  // no content, no attributes
			r += '>'; break;
		 case 1:  // has content, no attributes
			r += '>' + args[0]; break;
		 default: // has content, has attributes
			r += this.attrs(args[0]) + '>' + args[1]; break;
		}
		return r + `</${name}>`;
	}
	/**
	 * Composes multiple HTML elements with the given array of arguments.
	 * @param {...array} args - Array(s) of arguments for {@link TmplUtil#elem}
	 * @return {string} HTML
	 * @example
	 * const $ = require('TmplUtil');
	 * let html = $.elems(
	 *   ['script', { id: 'data1', type: 'application/json' }, data1],
	 *   ['script', { id: 'data2', type: 'application/json' }, data2],
	 *   ['script', { id: 'data3', type: 'application/json' }, data3],
	 * );
	 */
	elems(...args) {
		let r = '';
		for (let i = 0; i < args.length; i++) r += this.elem(...args[i]);
		return r;
	}
	/**
	 * Composes HTML attributes from the given object.
	 * @param {object|string} data - Object with keys as attribute names, or just a string
	 * @param {string} [sep=(whitespace)] - Separator for array values
	 * @return {string} HTML attributes
	 */
	attrs(data, sep = ' ') {
		if (!data) return '';
		if (typeof data == 'string') return ' ' + data;
		let r = '';
		for (let key in data) {
			let value = data[key];
			switch (typeof value) {
			case 'boolean':
				if (value) r += ` ${key}`;
				break;
			case 'undefined':
				break;
			case 'object':
				r += ` ${key}="${Array.isArray(value) ? value.join(sep) : value}"`;
				break;
			default:
				r += ` ${key}="${value}"`
			}
		}
		return r;
	}
	/**
	 * Escapes non-safe characters in the given string.
	 * @param {string} str
	 * @return {string} Modified string
	 */
	e(str) {
		if (!str) return '';
		let map = {
			'&': 'amp',
			'"': 'quot',
			"'": 'apos',
			'<': 'lt',
			'>': 'gt'
		};
		let ents = Object.values(map).join('|'); // to avoid double-escape '&'s
		let find = new RegExp(`["'<>]|(&(?!${ents};))`, 'g'); // regex negative match = (?!word)
		return `${str}`.replace(find, found => `&${map[found]};`);
	}
	/**
	 * Ternary-like.
	 * @param {any} cond Condition
	 * @param {string} then String to return if `cond` is truthy
	 * @param {string} [replace] Substring in `then` to replace with `cond`
	 * @param {string} [or] String to return if `cond` is falsey
	 * @return {string}
	 * @example
	 * const $ = require('TmplUtil');
	 * let name  = 'Joji';
	 * let greet = $.if(name, 'Hello, {*}.'); // "Hello, Joji."
	 */
	if(cond, then, replace = '{*}', or = '') {
		return cond ? then.replace(replace, cond) : or;
	}
	/**
	 * Formats an array to a `<ul>` list.
	 * If the array has only 1 item, omits `<ul>` and `<li>` tags
	 * @param {string[]} items - Array of strings
	 * @return {string} HTML
	 */
	list(items, forEach = null) {
		if (!items || !items.length) return '';
		if (!forEach) forEach = item => item;
		if (items.length == 1) return forEach(items[0]);
		let r = '';
		items.forEach(item => {
			r += '<li>' + forEach(item) + '</li>';
		});
		return `<ul>${r}</ul>`;
	}
	/**
	 * Formats an array to a multiline string.
	 * @param {string|string[]} strs - Array of strings
	 * @param {string} linebreak=\n - Linebreak to insert
	 * @return {string}
	 */
	lines(strs, linebreak = '\n') {
		return Array.isArray(strs) ? strs.join(linebreak) : strs;
	}
	/**
	 * Iterates over the given array or object.
	 * @param {any[]|object} over - Array or object to iterate over
	 * @param {function} fn - Callback for each iteration
	 * @param {string} [or] - Fallback if `over` was empty
	 * @return {string} A string consists of all the return values of `fn` concatenated
	 */
	iterate(over, fn, or = '') {
		let r = or;
		if (over) {
			if (Array.isArray(over) && over.length) {
				r = '';
				for (let i = 0; i < over.length; i++) {
					let fR = fn(over[i], i, over.length - 1);
					if (fR) r += fR;
				}
			} else {
				let keys = Object.keys(over);
				if (keys && keys.length) {
					r = '';
					for (let i = 0; i < keys.length; i++) {
						let key = keys[i];
						let fR = fn(over[key], key);
						if (fR) r += fR;
					}
				}
			}
		}
		return r;
	}
	/**
	 * Returns `<svg>` string of an icon.
	 * @param {string} name - Icon name
	 * @param {object} [attrs] - HTML attributes to add to resulting `<svg>`
	 * @return {string} HTML
	 * @see https://github.com/feathericons/feather
	 */
	icon(name, attrs = { class: 'icon' }) {
		let r = '';
		if (name in icons) r = icons[name].replace('{ATTRS}', this.attrs(attrs));
		else if (feather.icons[name]) r = feather.icons[name].toSvg(attrs);
		else throw `no such icon as '${name}'`;
		return r;
	}
	/**
	 * Returns all attributes of the given param object.
	 * @param {object} param - Param object
	 * @return {object[]} Attributes
	 */
	paramAttrs(param) {
		let r = [];
		if (param.optional) r.push({ long: 'optional', short: 'opt' });
		if (param.nullable) r.push({ long: 'nullable', short: 'null' });
		if (param.variable) r.push({ long: 'repeatable', short: 'rpt' });
		return r;
	}
}

const $ = new TmplUtil();
module.exports = $;