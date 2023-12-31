/**
 * An array wrapper that has a pointer to one of its items.
 * @author amekusa
 */
class SelectList {
	/**
	 * @param {any[]} items - Array of items
	 * @param {number} [initial] - Initial position
	 * @example
	 * let difficulty = new SelectList([
	 *   'easy',
	 *   'normal', // default
	 *   'hard'
	 * ], 1);
	 */
	constructor(items, initial = 0) {
		this.items = items;
		this.initialPos = this.pos = initial;
		this.fn;
	}
	/**
	 * A number of items.
	 * @type {number}
	 */
	get length() {
		return this.items.length;
	}
	/**
	 * The current item.
	 * @type {any}
	 */
	get curr() {
		return this.items[this.pos];
	}
	_checkIndex(index, or = 0) {
		if (index < 0 || index >= this.items.length) {
			console.error(`[SelectList] index out of bounds`);
			return or;
		}
		return index;
	}
	/**
	 * Returns an item by the given index.
	 * @param {number} index - Item index
	 */
	item(index) {
		return this.items[this._checkIndex(index)];
	}
	/**
	 * Registers a callback that is invoked on every pointer movement.
	 * @param {function} fn
	 */
	onSelect(fn) {
		this.fn = fn;
	}
	/**
	 * Returns the index of the given item.
	 * @param {any} item - Item to find
	 * @return {number} Index, or negative number if not found
	 */
	indexOf(item) {
		return this.items.indexOf(item);
	}
	/**
	 * Whether the given item is in the list.
	 * @param {any} item - Item to find
	 * @return {boolean}
	 */
	has(item) {
		return this.indexOf(item) >= 0;
	}
	/**
	 * Moves the pointer to the given item.
	 * @param {any} item - Item to find
	 * @return {any} Selected item
	 */
	select(item) {
		let pos = this.indexOf(item);
		return pos < 0 ? undefined : this.to(pos);
	}
	/**
	 * Moves the pointer to the given index.
	 * @param {number} pos - Index to move to
	 * @return {any} Selected item
	 */
	to(pos) {
		this.pos = this._checkIndex(pos);
		if (this.fn) this.fn(this.items[this.pos], this.pos, this);
		return this.items[this.pos];
	}
	/**
	 * Decrements the pointer.
	 * @param {boolean} [wrap]
	 * @return {any} Selected item
	 */
	prev(wrap = true) {
		this.pos = this.pos > 0 ? this.pos - 1 : (wrap ? this.items.length - 1 : 0);
		if (this.fn) this.fn(this.items[this.pos], this.pos, this);
		return this.items[this.pos];
	}
	/**
	 * Increments the pointer.
	 * @param {boolean} [wrap]
	 * @return {any} Selected item
	 */
	next(wrap = true) {
		let last = this.items.length - 1;
		this.pos = this.pos < last ? this.pos + 1 : (wrap ? 0 : last);
		if (this.fn) this.fn(this.items[this.pos], this.pos, this);
		return this.items[this.pos];
	}
}

export default SelectList;