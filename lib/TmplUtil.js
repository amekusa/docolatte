const feather = require('feather-icons');

/**
 * Template Utility
 * @author amekusa
 */
class TmplUtil {
	/**
	 * Composes HTML tag(s) with the given options
	 * @param {object|object[]} opts - Options, or an array of options for multiple tags
	 * @param {string} [opts.name=div] - Name of the tag
	 * @param {object} [opts.attrs] - Attributes of the tag
	 * @param {string|object|object[]} [opts.content] - Content of the tag. Can be another options for child tag(s)
	 * @return {string} HTML
	 *
	 * @example <caption>Composing a simple anchor tag</caption>
	 * let U = new TmplUtil();
	 * let a = U.tag({
	 *   name: 'a',
	 *   attrs: {
	 *     href: 'https://example.com',
	 *     title: 'Example Site'
	 *   },
	 *   content: 'See example'
	 * });
	 *
	 */
	tag(opts) {
		if (Array.isArray(opts)) {
			let r = '';
			for (let item of opts) r += this.tag(item);
			return r;
		}
		let { name = 'div', attrs, content = '' } = opts;
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
		return `<${name + _attrs}>${typeof content == 'object' ? this.tag(content) : content}</${name}>`;
	}
	/**
	 * Ternary-like
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
	 * Formats an array to a <UL> list.
	 * If the array has only 1 item, omits <UL> and <LI> tags
	 * @return {string}
	 * @author amekusa
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
	 * @param {string|string[]} strs
	 * @param {string} linebreak='\n'
	 * @return {string}
	 */
	lines(strs, linebreak = '\n') {
		return Array.isArray(strs) ? strs.join(linebreak) : strs;
	}
	/**
	 * Iterates over the given array
	 * @param {any[]} arr
	 * @param {function} fn
	 */
	iterate(arr, fn) {
		if (!arr) return;
		for (let i = 0; i < arr.length; i++) fn(arr[i], i, arr.length - 1);
	}
	/**
	 * Retunrs <svg> string of a icon
	 * @param {string} name
	 * @param {object} [attrs]
	 * @return {string}
	 * @see https://github.com/feathericons/feather
	 */
	icon(name, attrs = { class: 'icon' }) {
		if (!feather.icons[name]) throw `no such icon as '${name}'`;
		return feather.icons[name].toSvg(attrs);
	}
}

module.exports = TmplUtil;