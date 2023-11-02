const feather = require('feather-icons');

/**
 * Template Util
 * @author amekusa
 */
class TmplUtil {
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