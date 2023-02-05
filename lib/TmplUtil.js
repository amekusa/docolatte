/**
 * Template Util
 * @author amekusa
 */
class TmplUtil {

	/**
	 * Appends the 1st string to the 2nd string
	 * @return {string}
	 * @author amekusa
	 */
	append(str, to = ' ') {
		return str ? (to + str) : '';
	}
	/**
	 * Prepends the 1st string to the 2nd string
	 * @return {string}
	 * @author amekusa
	 */
	prepend(str, to = ' ') {
		return str ? (str + to) : '';
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
		if (items.length = 1) return forEach(items[0]);
		let r = '';
		items.forEach(item => {
			r += '<li>' + forEach(item) + '</li>';
		});
		return `<ul>${r}</ul>`;
	}
	/**
	 * Iterates over the given array
	 * @param {any[]} arr
	 * @param {function} fn
	 */
	iterate(arr, fn) {
		for (let i = 0; i < arr.length; i++) fn(arr[i], i, arr.length - 1);
	}
}

module.exports = TmplUtil;