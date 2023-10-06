/**
 * Scroll event watcher for smooth animation
 * @author amekusa
 */
class ScrollWatcher {
	constructor(target = window) {
		this.target = target;
		this.handlers = [];
	}
	onScroll(fn) {
		this.handlers.push(fn);
	}
	watch() {
		let c = { // context
			ev: null,
			elem: null,
			curr: { x: 0, y: 0, time: 0 },
			prev: { x: 0, y: 0, time: 0 },
			diff: { x: 0, y: 0, time: 0 }
		};
		let busy = false;
		let tick = time => {
			c.prev.time = c.curr.time;
			c.curr.time = time;
			c.diff.time = c.curr.time - c.prev.time;
			for (let i = 0; i < this.handlers.length; i++) this.handlers[i](c);
			busy = false;
		};
		this.target.addEventListener('scroll', ev => {
			if (busy) return;
			busy = true;
			c.ev = ev;
			c.elem = ev.target.scrollingElement;
			c.prev.x = c.curr.x;
			c.prev.y = c.curr.y;
			c.curr.x = c.elem.scrollLeft;
			c.curr.y = c.elem.scrollTop;
			c.diff.x = c.curr.x - c.prev.x;
			c.diff.y = c.curr.y - c.prev.y;
			if (c.diff.x || c.diff.y) {
				window.requestAnimationFrame(tick);
			}
		});
	}
}

export default ScrollWatcher;
