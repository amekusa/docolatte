import Fuse from 'fuse.js';

(() => {
	/**
	* @param {string} query
	* @param {int} index
	* @return {NodeList|Element|null}
	*/
	function q(query, index = null) {
		return find(document, query, index);
	}

	/**
	* @param {Element} elem
	* @param {string} query
	* @param {int} index
	* @return {NodeList|Element|null}
	*/
	function find(elem, query, index = null) {
		let items = elem.querySelectorAll(query);
		if (index == null) return items;
		if ((index+1) > items.length) return null;
		return items[index];
	}

	/**
	 * @param {string} tag
	 * @param {object} attribs
	 * @param {string|array|Element} child
	 * @return {Element}
	 */
	function elem(tag, attribs = null, child = null) {
		let r = document.createElement(tag);
		if (attribs) {
			for (let i in attribs) r.setAttribute(i, attribs[i]);
		}
		if (child) {
			if (!Array.isArray(child)) child = [child];
			for (let item of child) {
				if (typeof item == 'string') r.innerHTML += item;
				else r.appendChild(item);
			}
		}
		return r;
	}

	document.addEventListener('DOMContentLoaded', () => {
		// close the sidebar menu
		// when user clicked one of the menu items
		q('.sidebar a').forEach(a => {
			a.addEventListener('click', ev => {
				let checkbox = q('input#docolatte-shows-sidebar', 0);
				if (!checkbox) return;
				if (checkbox.checked) checkbox.click();
			});
		});

		// initialize search box
		(() => {
			let s = _SEARCH;
			let fuse = new Fuse(
				JSON.parse(s.list), // records to search
				JSON.parse(s.options), // options (including keys)
				Fuse.parseIndex(JSON.parse(s.index)) // index for better performance
			);
			let base = q('.sidebar .search-box', 0);
			let input = find(base, 'input[type=text]', 0);
			let lastQuery = '';
			input.addEventListener('keyup', ev => {
				let query = ev.target.value;
				if (query == lastQuery) return;
				lastQuery = query;

				let suggests = find(base, '.suggestions', 0);
				suggests.innerHTML = ''; // clear

				if (!query.length) return;
				let results = fuse.search(query, { limit: 8 });
				// if (results.length) console.debug('RESULTS:', results);
				for (let result of results) {
					let item = result.item;
					let li = elem('li', null, elem('a', { href: item.url }, item.longname));
					suggests.appendChild(li);
				}
			});
		})();

	});

})(); // END
