import Fuse from 'fuse.js';
import SimpleBar from 'simplebar';
import HLJS from 'highlight.js/lib/common';

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
	 * @param {Element} elem
	 * @param {string[]} queries
	 * @return {Element}
	 */
	function closest(elem, queries) {
		let r = elem;
		for (let i = 0; i < queries.length; i++) {
			let _r = r.closest(queries[i]);
			if (!_r) return r;
			r = _r;
		}
		return r;
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
				switch (typeof item) {
				case 'string':
				case 'number':
					r.innerHTML += item;
					break;
				default:
					r.appendChild(item);
				}
			}
		}
		return r;
	}

	/**
	 * Gets the offset position of an element from the specific ascendent node
	 * @param {Element} elem Node to get offset
	 * @param {Element} from Offset parent
	 * @param {number} recurse Recursion limit
	 * @return {number} offset.top
	 * @return {number} offset.left
	 */
	function getOffset(elem, from, recurse = 8) {
		let r = { top: 0, left: 0 };
		let child = elem;
		while (true) {
			if ('offsetTop'  in child) r.top  += child.offsetTop;
			if ('offsetLeft' in child) r.left += child.offsetLeft;
			let parent = child.offsetParent;
			if (!parent) return r;
			if (parent.isSameNode(from)) break;
			if (recurse < 1) break;
			recurse--;
			child = parent;
		}
		return r;
	}

	/**
	 * Returns the least amount of camera movement required for showing the given target boundary
	 * @param {number} viewStart
	 * @param {number} viewEnd
	 * @param {number} targetStart
	 * @param {number} targetEnd
	 * @param {number} [align] 0: align to start, 1: align to end
	 * @return {number}
	 */
	function pan(viewStart, viewEnd, targetStart, targetEnd, align = 0) {
		// console.debug('  viewStart:', viewStart);
		// console.debug('    viewEnd:', viewEnd);
		// console.debug('targetStart:', targetStart);
		// console.debug('  targetEnd:', targetEnd);
		// console.debug('------------');
		let viewLength = viewEnd - viewStart;
		let targetLength = targetEnd - targetStart;
		if (viewLength < targetLength) {
			switch (align) {
				case 1: return targetEnd - viewEnd;
				default: return targetStart - viewStart;
			}
		}
		if (viewStart > targetStart) return targetStart - viewStart;
		if (viewEnd < targetEnd) return targetEnd - viewEnd;
		return 0;
	}

	// DOM setup
	document.addEventListener('DOMContentLoaded', () => {

		// current page path
		const currentPage = window.location.pathname.substring(window.location.pathname.lastIndexOf('/')+1);

		// local storage
		const storage = window.sessionStorage;

		// table of contents
		const toc = q('.sidebar .toc', 0);
		const tocScroll = new SimpleBar(toc).getScrollElement();

		// restore TOC scroll position
		tocScroll.scrollTo({
			left: parseInt(storage.getItem('scrollX') || 0),
			top:  parseInt(storage.getItem('scrollY') || 0),
			behavior: 'instant'
		});
		toc.setAttribute('data-ready', 1);

		// save TOC scroll position
		window.onbeforeunload = () => {
			storage.setItem('scrollX', tocScroll.scrollLeft);
			storage.setItem('scrollY', tocScroll.scrollTop);
		};

		// highlight the anchors pointing at the current page
		find(toc, `a[href="${currentPage}"]`).forEach(a => { a.setAttribute('data-current', 1) });

		// toggle switch for sidebar
		const sidebarToggle = q('input#docolatte-sidebar-toggle', 0);

		// close sidebar when user clicked one of the menu items
		find(toc, 'a').forEach(a => {
			a.addEventListener('click', ev => {
				sidebarToggle.checked = false;
			});
		});

		// close sidebar with Escape key
		document.addEventListener('keydown', ev => {
			if (ev.key == 'Escape') sidebarToggle.checked = false;
		});

		{ // initialize search box
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
				sidebarToggle.checked = true;
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
		}

		{ // mark a TOC item as "current" on scroll
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
			let curr = { i: -1, a: null, wrap: null };

			const update = () => {
				for (let i = 0; i < headings.length; i++) {
					if (headings[i].offsetTop < scroll) continue;
					if (i == curr.i) break;
					let flag = 'data-current';
					if (curr.i >= 0 && curr.a.length) curr.a.forEach(a => { a.removeAttribute(flag) });
					curr.i = i;

					curr.a = find(toc, `a[href="${currentPage}#${headings[i].id}"]`);
					if (!curr.a.length) break;
					curr.a.forEach(a => { a.setAttribute(flag, 1) });

					// scroll TOC if necessary
					let a = curr.a[curr.a.length - 1];
					if (!curr.wrap) curr.wrap = closest(a, ['ul', 'li']);
					let view = tocScroll;
					let panning = pan(
						view.scrollTop,
						view.scrollTop + view.offsetHeight,
						getOffset(curr.wrap, toc).top,
						getOffset(a, toc).top + a.getBoundingClientRect().height,
						1
					);
					if (panning || view.scrollLeft) {
						view.scrollBy({
							left: -view.scrollLeft,
							top: panning,
							behavior: 'smooth'
						});
					}
					break;
				}
				ticking = false;
			}

			update();
		}

		{ // code highlight
			const linenums = [];

			const linenumify = (pre) => {
				let code = find(pre, 'code', 0);
				let lines = (code.innerHTML.trimEnd().match(/\n/g) || '').length + 1;
				let digits = lines.toString().length;
				let charWidth = find(pre, '._char', 0).getBoundingClientRect().width;
				let width = charWidth * (digits + 2); // px
				code.style.paddingLeft = width + charWidth + 'px';

				let r = elem('div', { class: 'linenums' });
				for (let i = 1; i <= lines; i++) {
					let id = 'line' + i;

					let btn = elem('a', { href: '#' + id }, i);
					btn.style.paddingRight = charWidth - 1 + 'px';
					btn.addEventListener('click', onClick);

					let linenum = elem('div', { id, class: 'linenum hljs' }, btn);
					linenum.style.width = width + 'px';
					linenums.push(linenum);
					r.appendChild(linenum);
				}
				pre.appendChild(r);
			}

			const onClick = function (ev) {
				ev.preventDefault();
				document.location = this.href;
				selectLine();
			}

			const selectLine = () => {
				let hash = document.location.hash;
				if (!hash) return;
				for (let i = 0; i < linenums.length; i++) {
					let linenum = linenums[i];
					if (linenum.id == hash.substring(1)) linenum.setAttribute('data-selected', 1);
					else linenum.removeAttribute('data-selected');
				}
			}

			q('.prettyprint code').forEach(HLJS.highlightElement);
			q('.prettyprint.linenums').forEach(linenumify);

			selectLine();
		}

	}); // DOM setup

})(); // END
