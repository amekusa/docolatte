import Fuse from 'fuse.js';

/*!
 * The main script for docolatte
 * @author Satoshi Soma (amekusa.com)
 *
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

	/**
	 * Gets the offset position of an element from the specific ascendent node
	 * @param {Element} elem Node to get offset
	 * @param {Element} from Offset parent
	 * @param {number} depth Recursion limit
	 * @return {number} offset.top
	 * @return {number} offset.left
	 */
	function getOffset(elem, from, depth = 8) {
		let r = { top: 0, left: 0 };
		let child = elem;
		while (true) {
			let parent = child.offsetParent;
			if (!parent) return r;
			if (parent.isSameNode(from)) break;
			if (depth < 1) break;
			depth--;
			child = parent;
		}
		if ('offsetTop'  in child) r.top  = child.offsetTop;
		if ('offsetLeft' in child) r.left = child.offsetLeft;
		return r;
	}

	// DOM setup
	document.addEventListener('DOMContentLoaded', () => {
		const currentPage = window.location.pathname.substring(window.location.pathname.lastIndexOf('/')+1);
		// console.debug('CURRENT PAGE:', currentPage);

		const toc = q('.sidebar .toc', 0); // table of contents
		const showsSidebar = q('input#docolatte-shows-sidebar', 0); // toggle switch for sidebar

		// highlight the anchors pointing at the current page
		find(toc, `a[href="${currentPage}"]`).forEach(a => {
			a.classList.add('current');

			// scroll TOC to the anchor
			let offset = getOffset(a, toc);
			toc.scrollTo({
				left: 0,
				top: offset.top - 24,
				behavior: 'auto' // 'smooth'
			});
		});

		// close sidebar when user clicked one of the menu items
		find(toc, 'a').forEach(a => {
			a.addEventListener('click', ev => {
				showsSidebar.checked = false;
			});
		});

		// close sidebar with Escape key
		document.addEventListener('keydown', ev => {
			if (ev.key == 'Escape') showsSidebar.checked = false;
		});

		// initialize search box
		(() => {
			let fuse = new Fuse(
				JSON.parse(_SEARCH.list), // records to search
				JSON.parse(_SEARCH.options), // options (including keys)
				Fuse.parseIndex(JSON.parse(_SEARCH.index)) // index for better performance
			);
			let base = find(toc, '.search-box', 0);
			let input = find(base, 'input[type=text]', 0);
			let suggests = find(base, '.suggestions', 0);
			let hint = find(base, '.hint', 0);
			let lastQuery = '';

			// search as you type
			input.addEventListener('input', ev => {
				let query = ev.target.value;
				if (query == lastQuery) return;
				lastQuery = query;

				suggests.innerHTML = ''; // clear
				suggests.setAttribute('data-select', 0); // reset the state

				if (!query.length) return;
				let results = fuse.search(query, { limit: 8 });
				if (!results.length) return;
				// console.debug('RESULTS:', results);

				hint.classList.add('hidden'); // hide hint

				// show the results
				for (let i = 0; i < results.length; i++) {
					let item = results[i].item;
					let label = item.longname.replaceAll(/(\W)/g, '<i class="symbol">$1</i><wbr>'); // insert <WBR> at every symbol chars
					let li = elem('li', null, elem('a', { href: item.url }, label));
					if (i == 0) li.classList.add('selected'); // select the 1st item
					suggests.appendChild(li);
				}
			});

			// navigate through suggestions with key presses
			input.addEventListener('keydown', ev => {
				if (ev.key == 'Escape') return ev.target.blur(); // ESC to unfocus
				if (!suggests.children.length) return;

				let select = Number.parseInt(suggests.getAttribute('data-select') || 0);
				let selectNew = select;

				// navigation
				switch (ev.key) {
				case 'ArrowDown':
					selectNew++;
					break;
				case 'ArrowUp':
					selectNew--;
					break;
				case 'Tab':
					selectNew += (ev.shiftKey ? -1 : 1);
					break;
				case 'Enter':
					find(suggests.children[select], 'a', 0).click();
					break;
				default:
					return; // do nothing
				}
				if (selectNew < 0) selectNew = suggests.children.length - 1;   // jump to bottom from top
				else if (selectNew >= suggests.children.length) selectNew = 0; // jump to top from bottom
				suggests.children[select].classList.remove('selected'); // unselect the previous
				suggests.children[selectNew].classList.add('selected'); // select the new
				suggests.setAttribute('data-select', selectNew);
				ev.preventDefault();
			});

			// hint
			input.addEventListener('click', ev => {
				if (ev.target.value) return;
				hint.classList.remove('hidden');
			});
			input.addEventListener('blur', ev => {
				hint.classList.add('hidden');
			});

			// force sidebar to show when searchbox gets focused
			input.addEventListener('focus', ev => {
				showsSidebar.checked = true;
			});

			// type any "printable" key to start a search
			document.addEventListener('keydown', ev => {
				// console.debug('KEYDOWN:', ev);
				if (ev.key.length != 1) return; // ignore non-printable keys
				if (ev.key == ' ') return;      // ignore SPACE key
				if (ev.metaKey || ev.ctrlKey || ev.altKey) return; // ignore keys with modifiers
				if (ev.target.tagName == 'INPUT' || ev.target.tagName == 'TEXTAREA') return;
				input.value = '';
				input.focus();
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
			let currentA = [], prevA = null;
			function update() {
				// console.debug('SCROLL:', scroll);

				// process headings from bottom to top
				// (assuming the list is ordered by 'offsetTop')
				for (let i = headings.length - 1; i >= 0; i--) {
					let item = headings.item(i);
					if ((item.offsetTop - 12) > scroll) continue;
					if (i === currentH) break;

					prevH = currentH;
					currentH = i;
					// console.debug('CURRENT H:', currentH, item);

					// highlight all the '#' anchors pointing at the current header
					prevA = currentA;
					currentA = find(toc, `a[href="${currentPage + '#' + item.id}"]`);
					// console.debug('CURRENT A:', currentA);
					prevA.forEach(a => { a.classList.remove('current') });
					currentA.forEach(a => { a.classList.add('current') });
					break;
				}

				ticking = false;
			}

			update();
		})();

	}); // DOM setup

})(); // END
