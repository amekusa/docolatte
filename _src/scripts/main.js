import Fuse from 'fuse.js';
import SimpleBar from 'simplebar';
import HLJS from 'highlight.js/lib/common';
import ScrollWatcher from './ScrollWatcher.js';
import LightSwitch from './LightSwitch.js';
import Debugger from './Debugger.js';

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
	const debug = new Debugger('[main]', true);
	debug.log('script started');

	// global namespace
	const global = window.$docolatte = {};


	// ---- Functions -------- *

	/**
	 * @param {string} query
	 * @param {int} index
	 * @return {NodeList|Element|null}
	 */
	function q(query, index = null) {
		return find(document, query, index);
	}

	/**
	 * @param {Element} scope
	 * @param {string} query
	 * @param {int} index
	 * @return {NodeList|Element|null}
	 */
	function find(scope, query, index = null) {
		let items = scope.querySelectorAll(query);
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


	// ---- Tasks -------- *

	// initialize light switch
	const ls = global.lightSwitch = new LightSwitch();
	ls.setStorage(localStorage, 'lightSwitch');
	ls.setRoom(document.documentElement, 'data-color-scheme');
	ls.load(); // apply color scheme to <html> *BEFORE* DOM loaded

	// DOM setup
	document.addEventListener('DOMContentLoaded', () => {
		debug.log('dom content loaded');

		// docolatte config
		const config = global.config;
		debug.log('config:', config);

		// current page path
		const currentPage = location.pathname.substring(location.pathname.lastIndexOf('/')+1);

		// browser storage
		const storage = sessionStorage;

		// window scroll watcher
		const sw = new ScrollWatcher(window);

		// sidebar & TOC
		const sidebar = q('.sidebar .wrap', 0);
		const sidebarScr = new SimpleBar(sidebar).getScrollElement();
		const toc = find(sidebar, '.toc', 0);

		// restore sidebar scroll position
		sidebarScr.scrollTo({
			left: parseInt(storage.getItem('scrollX') || 0),
			top:  parseInt(storage.getItem('scrollY') || 0),
			behavior: 'instant'
		});
		sidebar.setAttribute('data-ready', 1);

		// save sidebar scroll position
		onbeforeunload = () => {
			storage.setItem('scrollX', sidebarScr.scrollLeft);
			storage.setItem('scrollY', sidebarScr.scrollTop);
		};

		// highlight TOC item that is pointing at the current page
		find(toc, `a[href="${currentPage}"]`).forEach(a => {
			a.setAttribute('data-current', 1);
		});

		// toggle switch for sidebar
		const sidebarToggle = q('input#docolatte-sidebar-toggle', 0);

		// close sidebar when user clicked one of the menu items
		find(sidebar, 'a').forEach(a => {
			a.addEventListener('click', ev => {
				sidebarToggle.checked = false;
			});
		});

		// close sidebar with Escape key
		document.addEventListener('keydown', ev => {
			if (ev.key == 'Escape') sidebarToggle.checked = false;
		});

		{ // light switch
			let btn = q('.light-switch', 0);
			if (btn) {
				ls.setSwitch(btn, 'data-state');
				ls.sync();
			}
		}

		{ // initialize search box
			let fuse = new Fuse(
				JSON.parse(q('#docolatte-search-items', 0).innerHTML), // records to search
				JSON.parse(q('#docolatte-search-options', 0).innerHTML), // options (including keys)
				Fuse.parseIndex(JSON.parse(q('#docolatte-search-index', 0).innerHTML)) // search index
			);
			let base = find(sidebar, '.search-box', 0);
			let input = find(base, 'input[type=text]', 0);
			let dropdown = find(base, '.dropdown', 0);
			let hint = find(base, '.hint', 0); // can be not present
			let lastQuery = '';

			// search as you type
			input.addEventListener('input', ev => {
				let query = ev.target.value;
				if (query == lastQuery) return;
				lastQuery = query;

				dropdown.innerHTML = ''; // clear
				dropdown.setAttribute('data-select', 0); // reset the state

				if (!query.length) return;
				let results = fuse.search(query, { limit: config.searchLimit || 8 });
				if (!results.length) return;
				// console.debug('RESULTS:', results);

				if (hint) hint.classList.add('hidden'); // hide hint

				// show the results
				for (let i = 0; i < results.length; i++) {
					let item = results[i].item;
					let url   = item.$[0];
					let label = item.$[1].replaceAll(/(\W)/g, '<i class="symbol">$1</i><wbr>'); // insert <WBR> at every symbol chars
					let li = elem('li', null, elem('a', { href: url }, label));
					if (i == 0) li.classList.add('selected'); // select the 1st item
					dropdown.appendChild(li);
				}
			});

			// navigate through dropdown-list with key presses
			input.addEventListener('keydown', ev => {
				if (ev.key == 'Escape') return ev.target.blur(); // ESC to unfocus
				if (!dropdown.children.length) return;

				let select = Number.parseInt(dropdown.getAttribute('data-select') || 0);
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
					find(dropdown.children[select], 'a', 0).click();
					break;
				default:
					return; // do nothing
				}
				if (selectNew < 0) selectNew = dropdown.children.length - 1;   // jump to bottom from top
				else if (selectNew >= dropdown.children.length) selectNew = 0; // jump to top from bottom
				dropdown.children[select].classList.remove('selected'); // unselect the previous
				dropdown.children[selectNew].classList.add('selected'); // select the new
				dropdown.setAttribute('data-select', selectNew);
				ev.preventDefault();
			});

			// hint
			if (hint) {
				input.addEventListener('click', ev => {
					if (ev.target.value) return;
					hint.classList.remove('hidden');
				});
				input.addEventListener('blur', ev => {
					hint.classList.add('hidden');
				});
			}

			// on focus searchbox
			input.addEventListener('focus', ev => {
				// force sidebar to show when searchbox gets focused
				sidebarToggle.checked = true;

				// scroll sidebar to top
				sidebarScr.scrollTo({
					left: 0,
					top: 0,
					behavior: 'instant'
				});
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
			let headings = q('article.doc h4.name[id]');
			let curr = { i: -1, a: null, wrap: null };

			sw.on(['init', 'scroll'], c => {
				debug.log('toc update started');
				for (let i = 0; i < headings.length; i++) {
					if (headings[i].offsetTop < c.curr.y) continue;
					if (i == curr.i) break;

					// change current URL hash
					let hash = '#' + headings[i].id;
					history.replaceState(null, null, hash);

					// update "current" state of TOC
					let flag = 'data-current';
					if (curr.i >= 0 && curr.a.length) curr.a.forEach(a => { a.removeAttribute(flag) });
					curr.i = i;
					curr.a = find(toc, `a[href="${currentPage + hash}"]`);
					if (!curr.a.length) break;
					curr.a.forEach(a => { a.setAttribute(flag, 1) });

					// scroll sidebar if necessary
					let a = curr.a[curr.a.length - 1];
					if (!curr.wrap) curr.wrap = closest(a, ['ul', 'li']);
					let view = sidebarScr;
					let panning = pan(
						view.scrollTop,
						view.scrollTop + view.offsetHeight,
						getOffset(curr.wrap, sidebar).top,
						getOffset(a, sidebar).top + a.getBoundingClientRect().height,
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
				debug.log('toc update done');
			});
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

		// start window scroll watcher
		sw.watch(['init', 'scroll']);

	}); // DOM setup

	debug.log('script done');

})(); // END
