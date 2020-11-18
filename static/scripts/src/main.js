import Fuse from 'fuse.js';

/**
 * The main script for docolatte
 * @author Satoshi Soma (amekusa.com)
 */

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

	// DOM setup
	document.addEventListener('DOMContentLoaded', () => {
		const currentPage = window.location.pathname.substring(window.location.pathname.lastIndexOf('/')+1);
		// console.debug('CURRENT PAGE:', currentPage);

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

		// scroll related features
		(() => {
			let scroll = window.scrollY;
			let ticking = false;

			window.addEventListener('scroll', ev => {
				if (ticking) return;
				if (window.scrollY == scroll) return;
				scroll = window.scrollY;
				ticking = true;
				window.requestAnimationFrame(update);
			});

			let headings = q('article.doc h4.name[id]');
			let currentH, prevH = null;
			let currentA, prevA = null;
			function update() {
				// console.debug('SCROLL:', scroll);

				// process headings from bottom to top
				// (assuming the list is ordered by 'offsetTop')
				for (let i = headings.length - 1; i >= 0; i--) {
					let item = headings.item(i);
					if ((item.offsetTop-12) > scroll) continue;
					if (i === currentH) break;

					prevH = currentH;
					currentH = i;
					// console.debug('CURRENT H:', currentH, item);

					// highlight the current anchor in TOC
					prevA = currentA;
					currentA = q(`.sidebar .toc a[href="${currentPage + '#' + item.id}"]`, 0);
					// console.debug('CURRENT A:', currentA);
					if (currentA) currentA.classList.add('current');
					if (prevA) prevA.classList.remove('current');
					break;
				}

				ticking = false;
			}

			update(window.scrollY)
		})();

	}); // DOM setup

})(); // END
