/**
 * Provides color scheme switch functionality
 * @author amekusa
 */
class LightSwitch {
	/**
	 * @param {string[]} states - All possible states
	 * @param {number} initial - Initial state index
	 */
	constructor(states = null, initial = 0) {
		this.room = null;
		this.button = null;
		this.storage = null;
		this.states = states || ['auto', 'light', 'dark'];
		this.state = initial;
		this.pref;
	}
	/**
	 * Fetch user's system preference
	 * @return {number} index of the preferred state
	 */
	getPreference() {
		if (this.pref === undefined) for (let i = 0; i < this.states.length; i++) {
			let state = this.states[i];
			if (state == 'auto') continue;
			if (matchMedia(`(prefers-color-scheme: ${state})`).matches) {
				this.pref = i;
				break;
			}
		}
		return this.pref;
	}
	/**
	 * Sets a storage object to store state
	 * @param {Storage} obj
	 * @param {string} key
	 */
	setStorage(obj, key) {
		this.storage = { obj, key };
		return this;
	}
	/**
	 * Connects a "room" element to sync state
	 * @param {Element} elem - Element
	 * @param {string} attr - Attribute to sync state
	 */
	setRoom(elem, attr) {
		this.room = { elem, attr };
		return this;
	}
	/**
	 * Connects a button element to sync state
	 * @param {Element} elem - Element
	 * @param {string} attr - Attribute to sync state
	 */
	setButton(elem, attr) {
		this.button = { elem, attr };
		elem.addEventListener('click', ev => {
			ev.preventDefault();
			this.nextState().save();
		});
		return this;
	}
	setState(idx) {
		let max = this.states.length - 1;
		this.state = idx < 0 ? 0 : (idx > max ? max : idx);
		this.sync();
		return this;
	}
	nextState() {
		this.state = (this.state >= (this.states.length - 1)) ? 0 : (this.state + 1);
		this.sync();
		return this;
	}
	/**
	 * Sync DOM elements with the current state
	 */
	sync() {
		if (this.room)   this.room.elem.setAttribute(this.room.attr, this.states[this.state]);
		if (this.button) this.button.elem.setAttribute(this.button.attr, this.states[this.state]);
		return this;
	}
	load() {
		// load saved state stored in the browser storage, if it exists
		if (this.storage) {
			let loaded = this.storage.obj.getItem(this.storage.key);
			if (loaded) {
				this.setState(parseInt(loaded));
				return;
			}
		}
		// if saved state not found, use room's current state
		let { elem, attr } = this.room;
		let state = elem.getAttribute(attr);
		let idx = this.states.indexOf(state);
		this.setState(idx < 0 ? this.getPreference() : idx);
		return this;
	}
	save() {
		if (this.storage) this.storage.obj.setItem(this.storage.key, this.state);
		return this;
	}
}

export default LightSwitch;
