import SelectList from './SelectList.js';
import Exception from './Exception.js';
import Debugger from './Debugger.js';
const E = new Exception('[LightSwitch]');
const debug = new Debugger('[DBG:LS]', true);

/**
 * Color scheme switcher.
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
class LightSwitch {
	/**
	 * @param {string[]} [states] - All possible states. Default: `['auto', 'light', 'dark]`
	 * @param {number} [initial] - Initial state index
	 */
	constructor(states, initial = 0) {
		this.switch = null;
		this.room = null;
		this.storage = null;
		this.states = new SelectList(states || ['auto', 'light', 'dark'], initial);
		this.states.onSelect(() => { this.sync(); });
		this._pref;
	}
	/**
	 * The current state.
	 * @type {string}
	 * @readonly
	 */
	get state() {
		return this.states.curr;
	}
	/**
	 * The current state of the room.
	 * @type {string}
	 * @readonly
	 */
	get roomState() {
		return this.state == 'auto' ? this.getPreference() : this.state;
	}
	/**
	 * Fetch user's system preference.
	 * @param {boolean} [update] - Force update
	 * @return {string} preferred state
	 */
	getPreference(update = false) {
		if (this._pref === undefined || update) {
			debug.log(`matching user preference...`);
			let states = this.states.items;
			for (let i = 0; i < states.length; i++) {
				let state = states[i];
				if (state == 'auto') continue;
				if (matchMedia(`(prefers-color-scheme: ${state})`).matches) {
					debug.log(`matched user preference:`, state);
					this._pref = i;
					return state;
				}
			}
			E.warn(`cannot find user preference`);
			return this.states.item(this.states.initialPos);
		}
		return this.states.item(this._pref);
	}
	/**
	 * Sets a storage object to store state.
	 * @param {Storage} obj
	 * @param {string} key
	 * @example
	 * ls.setStorage(localStorage, 'lightSwitch');
	 */
	setStorage(obj, key) {
		this.storage = { obj, key };
	}
	/**
	 * Connects a "switch" element to sync state.
	 * @param {Element} elem - Element
	 * @param {string} attr - Attribute to sync state
	 */
	setSwitch(elem, attr) {
		this.switch = { elem, attr };
		elem.addEventListener('click', ev => {
			ev.preventDefault();
			this.nextState();
			this.save();
		});
	}
	/**
	 * Connects a "room" element to sync state.
	 * @param {Element} elem - Element
	 * @param {string} attr - Attribute to sync state
	 */
	setRoom(elem, attr) {
		this.room = { elem, attr };
	}
	/**
	 * Sets the current state.
	 * @param {number|string} state - State name or index
	 * @example
	 * ls.setState('dark');
	 */
	setState(state) {
		let pos = typeof state == 'number' ? state : this.states.indexOf(state);
		if (pos < 0) return E.error(`invalid state`, { state });
		this.states.to(pos);
	}
	/**
	 * Switches to the previous state.
	 */
	prevState() {
		this.states.prev();
	}
	/**
	 * Switches to the next state.
	 */
	nextState() {
		this.states.next();
	}
	/**
	 * Syncs the "switch" and the "room" elements with the current state of this LightSwitch.
	 */
	sync() {
		this.syncSwitch();
		this.syncRoom();
	}
	/**
	 * Syncs the "switch" element with the current state of this LightSwitch.
	 */
	syncSwitch() {
		if (this.switch) {
			this.switch.elem.setAttribute(this.switch.attr, this.state);
			debug.log(`synced switch`);
		}
	}
	/**
	 * Syncs the "room" element with the current state of this LightSwitch.
	 */
	syncRoom() {
		if (this.room) {
			this.room.elem.setAttribute(this.room.attr, this.roomState);
			debug.log(`synced room`);
		}
	}
	/**
	 * Initializes the state by loading it from the browser storage,
	 * or reading the attribute values of "switch" or "room" element.
	 */
	load() {
		// load saved state stored in the browser storage, if it exists
		if (this.storage) {
			debug.log(`loading state from storage...`);
			debug.log(` - storage:`, this.storage);
			let loaded = this.storage.obj.getItem(this.storage.key);
			if (loaded) {
				debug.log(`state loaded:`, loaded);
				this.states.to(parseInt(loaded));
				return;
			}
			debug.log(`state not found`);
		}
		// if saved state was not found, use DOM attribute instead
		debug.log(`retrieving state from doms...`);
		let { elem, attr } = this.switch || this.room;
		let state = elem.getAttribute(attr);
		if (!state) return E.error(`load(): cannot find state`);
		let pos = this.states.indexOf(state);
		if (pos < 0) return E.error(`load(): invalid state`, { state });
		debug.log(`state found:`, state);
		this.states.to(pos);
	}
	/**
	 * Saves the current state to the browser storage.
	 */
	save() {
		if (this.storage) {
			this.storage.obj.setItem(this.storage.key, this.states.pos);
			debug.log(`saved state`);
		}
	}
}

export default LightSwitch;
