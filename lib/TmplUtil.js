const { format } = require('node:util');
const helper = require('jsdoc/util/templateHelper');
const feather = require('feather-icons');

/**
 * Template Utility
 * @author amekusa
 */
class TmplUtil {
	/**
	 * Composes HTML element(s) with the given options.
	 * @param {object|object[]} opts - Options, or an array of options for multiple elements
	 * @param {string} [opts.name] - Tag name. If this is omitted, outputs only `content`
	 * @param {object} [opts.attrs] - Attributes
	 * @param {string|object|object[]} [opts.content] - Content of the element. Can be another options for child element(s)
	 * @param {boolean} [opts.close=true] - Puts the closing tag at the end, or not
	 * @return {string} HTML
	 *
	 * @example <caption>Composing a simple anchor element</caption>
	 * let $ = new TmplUtil();
	 * let a = $.elem({
	 *   name: 'a',
	 *   attrs: {
	 *     href: 'https://example.com',
	 *     title: 'Example Site'
	 *   },
	 *   content: 'See example'
	 * });
	 *
	 */
	elem(opts) {
		if (Array.isArray(opts)) {
			let r = '';
			for (let item of opts) r += this.elem(item);
			return r;
		}
		let r = typeof opts.content == 'object'
			? this.elem(opts.content)
			: (opts.content || '');
		let { name, attrs, close = true } = opts;
		if (name) {
			let _attrs = '';
			if (attrs) for (let key in attrs) {
				let value = attrs[key];
				switch (typeof value) {
				case 'boolean':
					if (value) _attrs += ` ${key}`;
					break;
				case 'undefined':
					break;
				default:
					_attrs += ` ${key}="${value}"`
				}
			}
			r = `<${name + _attrs}>` + r;
			if (close) r += `</${name}>`;
		}
		return r;
	}
	/**
	 * Escapes non-safe characters in the given string.
	 * @param {string} str
	 * @return {string} Modified string
	 */
	e(str) {
		let map = {
			'&': '&amp;',
			'"': '&quot;',
			"'": '&apos;',
			'<': '&lt;',
			'>': '&gt;'
		};
		return str.replace(/[&"'<>]/g, found => map[found]);
	}
	/**
	 * Ternary-like.
	 * @param {any} cond Condition
	 * @param {string} then String to return if `cond` is truthy
	 * @param {string} [replace] Substring in `then` to replace with `cond`
	 * @param {string} [or] String to return if `cond` is falsey
	 * @return {string}
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
	 * Iterates over the given array.
	 * @param {any[]} arr - Array to iterate over
	 * @param {function} fn - Callback for iteration
	 * @param {string} [or] - Fallback if the array was empty
	 * @return {string} A string consists of all the return values of `fn` concatenated
	 */
	iterate(arr, fn, or = '') {
		let r = '';
		if (arr && arr.length) {
			for (let i = 0; i < arr.length; i++) {
				let fR = fn(arr[i], i, arr.length - 1);
				if (fR) r += fR;
			}
		} else r += or;
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
		if (!feather.icons[name]) throw `no such icon as '${name}'`;
		return feather.icons[name].toSvg(attrs);
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
	/**
	 * Filters the given type string.
	 * If the string is something like `Array.<type>`, it gets shorten to like `type[]`.
	 * @param {string} type - Type string
	 * @return {string} Modified type string
	 */
	typeString(type) {
		let m = type.match(/^Array\.<(.+?)>$/);
		if (!m) return helper.linkto(type, helper.htmlsafe(type));
		return helper.linkto(m[1], m[1]) + '[]';
	}
}

TmplUtil.prototype.format = format;
module.exports = TmplUtil;