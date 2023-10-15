import Debugger from './Debugger.js';
const debug = new Debugger('[DBG:SW]', true);

/**
 * Scroll event watcher for smooth animation
 * @author amekusa
 */
class ScrollWatcher {
	/**
	 * @param {Element} [target=window]
	 */
	constructor(target = window) {
		this.target = target;
		this.tasks = {
			init: [],
			scroll: [],
			resize: [],
		};
	}
	/**
	 * Registers a callback
	 * @param {string|string[]} ev - Event name(s). Pass `any` to register to all the available events
	 * @param {function} fn - Callback
	 */
	on(ev, fn) {
		if (Array.isArray(ev)) {
			for (let i = 0; i < ev.length; i++) this.on(ev[i], fn);
		} else if (ev == 'any') {
			for (let key in this.tasks) this.on(key, fn);
		} else this.tasks[ev].push(fn);
	}
	/**
	 * Starts watching scroll event
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
				case 'init':   handler({ type: 'init' }); break; // fake event
				case 'scroll': this.target.addEventListener('scroll', handler); break;
				case 'resize': window.addEventListener('resize', handler); break;
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
