/**
 * Provides color scheme switch functionality
 * @author amekusa
 */
class LightSwitch {
	/**
	 * @param {string[]} states
	 * @param {number} initial
	 */
	constructor(states = null, initial = 0) {
		this.room = null;
		this.button = null;
		this.storage = null;
		this.states = states || ['light', 'dark'];
		this.state = 0;
		this.preference = 0;
	}
	getPreference() {
		if (!this.preference) for (let i = 0; i < this.states.length; i++) {
			let state = this.states[i];
			if (matchMedia(`(prefers-color-scheme: ${state})`).matches) {
				this.preference = i;
				break;
			}
		}
		return this.preference;
	}
	/**
	 * @param {Storage} obj
	 * @param {string} key
	 */
	setStorage(obj, key) {
		this.storage = { obj, key };
		return this;
	}
	/**
	 * @param {Element} elem
	 * @param {string} attr
	 */
	setRoom(elem, attr) {
		this.room = { elem, attr };
		return this;
	}
	/**
	 * @param {Element} elem
	 * @param {string} attr
	 */
	setButton(elem, attr) {
		this.button = { elem, attr };
		elem.addEventListener('click', ev => {
			this.nextState();
		});
		return this;
	}
	setState(idx) {
		let max = this.states.length - 1;
		this.state = idx < 0 ? 0 : (idx > max ? max : idx);
		this.render();
		return this;
	}
	nextState() {
		this.state = (this.state >= (this.states.length - 1)) ? 0 : (this.state + 1);
		this.render();
		return this;
	}
	/**
	 * Sync DOM elements with the current state
	 */
	render() {
		if (this.room)   this.room.elem.setAttribute(this.room.attr, this.states[this.state]);
		if (this.button) this.button.elem.setAttribute(this.button.attr, this.states[this.state]);
		return this;
	}
	load() {
		if (this.storage) {
			let loaded = this.storage.obj.getItem(this.storage.key);
			if (loaded) {
				this.setState(parseInt(loaded));
				return;
			}
		}
		let { elem, attr } = this.room;
		let state = elem.getAttribute(attr);
		let idx = this.states.indexOf(state);
		this.setState(idx < 0 ? this.getPreference() : idx);
	}
	save() {
		if (this.storage) this.storage.obj.setItem(this.storage.key, this.state);
	}
}

export default LightSwitch;
