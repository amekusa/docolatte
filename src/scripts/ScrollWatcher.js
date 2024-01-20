import Debugger from './Debugger.js';
const debug = new Debugger('[DBG:SW]', true);

/**
 * Scroll event watcher for smooth animation.
 * @author Satoshi Soma (amekusa.com)
 * @license Apache-2.0
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
class ScrollWatcher {
	/**
	 * @param {Element} [target=window] - Element to watch
	 */
	constructor(target = window) {
		this.target = target;
		this.tasks = {
			init: [],
			scroll: [],
			resize: [],
			scrollend: [],
		};
	}
	/**
	 * Registers a callback.
	 * @param {string|string[]} ev - Event name(s). Pass `any` to register to all the available events
	 * @param {function} fn - Callback
	 * @example
	 * let sw.on('scroll', ev => {
	 *   console.log('Scroll Detected');
	 * });
	 */
	on(ev, fn) {
		if (Array.isArray(ev)) {
			for (let i = 0; i < ev.length; i++) this.on(ev[i], fn);
		} else if (ev == 'any') {
			for (let key in this.tasks) this.on(key, fn);
		} else this.tasks[ev].push(fn);
	}
	/**
	 * Starts watching scroll related events.
	 * @param {string|string[]} ev - Event name(s) to watch. `any` to watch all the available events
	 */
	watch(ev = 'any') {
		if (ev == 'any') ev = Object.keys(this.tasks);
		else if (!Array.isArray(ev)) ev = [ev];

		// context
		let c = new Stats({ x: 0, y: 0, mx: 0, my: 0, time: 0 });
		c.isFirst = true;
		c.event = null;

		let request = false; // animation frame request id
		let tick = time => {
			c.set('time', time);
			debug.log(`animation frame #${request} started @`, time);
			debug.log(' - diff:', c.diff.time);
			let tasks = this.tasks[c.event.type];
			for (let i = 0; i < tasks.length; i++) tasks[i](c);
			if (c.isFirst) c.isFirst = false;
			debug.log(`animation frame #${request} done`);
			request = false;
		};
		let propX, propY, propMX, propMY;
		if (this.target === window) {
			propX = 'scrollX';
			propY = 'scrollY';
			propMX = 'scrollMaxX';
			propMY = 'scrollMaxY';
		} else {
			propX = 'scrollLeft';
			propY = 'scrollTop';
			propMX = 'scrollLeftMax';
			propMY = 'scrollTopMax';
		}
		let handler = ev => {
			debug.log(`--- ${ev.type} event ---`);
			if (request) { // previous request is still in the queue
				window.cancelAnimationFrame(request); // cancel the previous request
				debug.log(`<BUSY!> canceled animation frame #${request}`);
			};
			c.event = ev;
			c.set('x', this.target[propX]);
			c.set('y', this.target[propY]);
			c.set('mx', this.target[propMX]);
			c.set('my', this.target[propMY]);
			request = window.requestAnimationFrame(tick);
			debug.log(`animation frame #${request} requested`);
		};
		for (let i = 0; i < ev.length; i++) {
			switch (ev[i]) {
				case   'init': handler({ type: 'init' }); break; // fake event
				case 'resize': window.addEventListener('resize', handler); break;
				default: this.target.addEventListener(ev[i], handler);
			}
		}
	}
}

class Stats {
	constructor(data) {
		this.curr = {};
		this.prev = {};
		this.diff = {};
		for (let key in data) {
			this.curr[key] = data[key];
			this.prev[key] = undefined;
			this.diff[key] = undefined;
		}
	}
	get(key) {
		return this.curr[key];
	}
	set(key, value) {
		this.prev[key] = this.curr[key];
		this.curr[key] = value;
		this.diff[key] = this.curr[key] - this.prev[key];
		return this;
	}
}

export default ScrollWatcher;
