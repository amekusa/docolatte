import Debugger from './Debugger.js';
const debug = new Debugger('[DBG:SW]', true);

/**
 * Scroll event watcher for smooth animation
 * @author amekusa
 */
class ScrollWatcher {
	/**
	 * @param {Element} target=window
	 */
	constructor(target = window) {
		this.target = target;
		this.tasks = [];
	}
	/**
	 * Registers a callback
	 * @param {function} fn
	 */
	onScroll(fn) {
		this.tasks.push(fn);
	}
	/**
	 * Starts watching scroll event
	 * @param {bool} dispatchFirst=false - If true, dispatches the tasks at once first
	 */
	watch(dispatchFirst = false) {
		let c = { // context
			ev: null,
			isFirst: true,
			curr: { x: 0, y: 0, time: 0 },
			prev: { x: 0, y: 0, time: 0 },
			diff: { x: 0, y: 0, time: 0 }
		};
		let ticking = false;
		let tick = time => {
			debug.log('animation frame started @', time);
			c.prev.time = c.curr.time;
			c.curr.time = time;
			c.diff.time = c.curr.time - c.prev.time;
			debug.log(' - diff:', c.diff.time);
			// debug.slow(8);
			for (let i = 0; i < this.tasks.length; i++) this.tasks[i](c);
			if (c.isFirst) c.isFirst = false;
			ticking = false;
			debug.log('animation frame done');
		};
		let propX, propY;
		if (this.target === window) {
			propX = 'scrollX';
			propY = 'scrollY';
		} else {
			propX = 'scrollLeft';
			propY = 'scrollTop';
		}
		this.target.addEventListener('scroll', ev => {
			debug.log('--- scroll event ---');
			if (ticking) {
				debug.log('[BUSY!] skipped requesting animation frame');
				return;
			};
			c.ev = ev;
			c.prev.x = c.curr.x;
			c.prev.y = c.curr.y;
			c.curr.x = this.target[propX];
			c.curr.y = this.target[propY];
			c.diff.x = c.curr.x - c.prev.x;
			c.diff.y = c.curr.y - c.prev.y;
			if (c.diff.x || c.diff.y) {
				ticking = true;
				window.requestAnimationFrame(tick);
				debug.log('animation frame requested');
			}
		});
		if (dispatchFirst) { // mimicking 'scroll' event
			c.curr.x = this.target[propX];
			c.curr.y = this.target[propY];
			window.requestAnimationFrame(tick);
			debug.log('1st animation frame requested');
		}
	}
}

export default ScrollWatcher;
