class SelectList {
	constructor(items, initial = 0) {
		this.items = items;
		this.initialPos = this.pos = initial;
		this.fn;
	}
	get length() {
		return this.items.length;
	}
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
	item(index) {
		return this.items[this._checkIndex(index)];
	}
	onSelect(fn) {
		this.fn = fn;
	}
	indexOf(item) {
		return this.items.indexOf(item);
	}
	has(item) {
		return this.indexOf(item) >= 0;
	}
	select(item) {
		let pos = this.indexOf(item);
		return pos < 0 ? undefined : this.to(pos);
	}
	to(pos) {
		this.pos = this._checkIndex(pos);
		if (this.fn) this.fn(this.items[this.pos], this.pos, this);
		return this.items[this.pos];
	}
	prev(wrap = true) {
		this.pos = this.pos > 0 ? this.pos - 1 : (wrap ? this.items.length - 1 : 0);
		if (this.fn) this.fn(this.items[this.pos], this.pos, this);
		return this.items[this.pos];
	}
	next(wrap = true) {
		let last = this.items.length - 1;
		this.pos = this.pos < last ? this.pos + 1 : (wrap ? 0 : last);
		if (this.fn) this.fn(this.items[this.pos], this.pos, this);
		return this.items[this.pos];
	}
}

export default SelectList;