/**
 * Debug utility.
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
class Debugger {
	/**
	 * @param {string} [label] - Log label
	 * @param {boolean} [enabled] - Whether to enable debugging
	 */
	constructor(label = '[DEBUG]', enabled = true) {
		this.label = label;
		this.enabled = enabled;
	}
	/**
	 * Enables debugging.
	 */
	enable() {
		this.enabled = true;
	}
	/**
	 * Disables debugging.
	 */
	disable() {
		this.enabled = false;
	}
	/**
	 * Outputs logs to console.
	 * @param {...any} args - Infos to log
	 */
	log(...args) {
		if (!this.enabled) return false;
		return console.debug(this.label, ...args);
	}
	/**
	 * Calls the given function.
	 * @param {function} fn - Function to call
	 * @param {...any} args - Arguments to pass to `fn`
	 * @return {any} Return of `fn`
	 */
	call(fn, ...args) {
		if (!this.enabled) return false;
		return fn(...args);
	}
	/**
	 * Simulates a heavy computing operation.
	 * @param {number} weight - How heavy
	 */
	slow(weight) {
		if (!this.enabled) return false;
		console.time(this.label + ' slow');
		let r = 0;
		for (let i = Math.pow(weight, 7); i >= 0; i--) r += Math.atan(i) * Math.tan(i);
		console.timeEnd(this.label + ' slow');
		return r;
	}
}

export default Debugger;
