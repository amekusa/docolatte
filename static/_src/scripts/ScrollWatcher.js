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
		let busy = false;
		let tick = time => {
			c.prev.time = c.curr.time;
			c.curr.time = time;
			c.diff.time = c.curr.time - c.prev.time;
			for (let i = 0; i < this.tasks.length; i++) this.tasks[i](c);
			if (c.isFirst) c.isFirst = false;
			busy = false;
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
			if (busy) return;
			busy = true;
			c.ev = ev;
			c.prev.x = c.curr.x;
			c.prev.y = c.curr.y;
			c.curr.x = this.target[propX];
			c.curr.y = this.target[propY];
			c.diff.x = c.curr.x - c.prev.x;
			c.diff.y = c.curr.y - c.prev.y;
			if (c.diff.x || c.diff.y) window.requestAnimationFrame(tick);
			else busy = false;
		});
		if (dispatchFirst) { // mimicking 'scroll' event
			c.curr.x = this.target[propX];
			c.curr.y = this.target[propY];
			tick(performance.now());
		}
	}
}

export default ScrollWatcher;
