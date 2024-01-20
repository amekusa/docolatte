const Fuse = require('fuse.js');
const dig = require('obj-digger');
const $ = require('./Util');

/**
 * Search database.
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
class SearchDB {
	/**
	 * @param {object} opts
	 * @param {string} opts.pk - Primary key
	 * @param {object} opts.search - Fuse.js options
	 * @see https://www.fusejs.io/api/options.html
	 */
	constructor(opts) {
		this.pk = opts.pk;
		this.options = opts.search;
		this.records = [];
		this.links   = [];
		this.serialized;
	}
	/**
	 * Feeds a new record.
	 * @param {object} record
	 * @param {object} link
	 * @param {string} link.url
	 * @param {string} link.label
	 */
	feed(record, link) {
		if (this.has(record)) {
			console.warn('[SearchDB]', 'duplicated feed:', record);
			return;
		}
		this.records.push(record);
		this.links.push(link);
	}
	/**
	 * Checks if the given record already exists.
	 * @param {object} record
	 * @return {boolean}
	 */
	has(record) {
		for (let i = 0; i < this.records.length; i++) {
			let item = this.records[i];
			if (item === record) return true;
			if (item[this.pk] && item[this.pk] === record[this.pk]) return true;
		}
		return false;
	}
	/**
	 * Serializes all the records into JSON format.
	 * @return {object}
	 */
	serialize() {
		console.log(`Serializing search DB...`);
		let opts = $.clone(this.options); // deep-clone the option object
		let map = {};
		let digits = 'abcdefghijklmnopqrstuvwxyz';
		for (let i = 0; i < opts.keys.length; i++) {
			let key = $.base(i, digits);  // short-key
			map[key] = opts.keys[i].name; // map: short-key => real-key
			opts.keys[i].name = key;      // replace real-key with short-key
		}
		/* NOTE:
		 * Shorten each key to a single char (a-z)
		 * like this:
		 *   opts.keys = [
		 *     { name: a, weight: ... },
		 *     { name: b, weight: ... },
		 *     { name: c, weight: ... },
		 *     ...
		 *   ]
		 */

		let breaks = /(?:<br(?:\s*\/)?>|[\r\n])/gi;
		let tags = /(?:<\w+>|<\/\w+>|<\w+\s*\/>)/g;
		let items = [];
		for (let i = 0; i < this.records.length; i++) {
			let record = this.records[i];
			let link   = this.links[i];
			let item = { $: [link.url, link.label] };
			for (let key of opts.keys) {
				let { found } = dig(record, map[key.name]); // get data with real-key
				if (!found) continue;
				found = found.replaceAll(breaks, ' ');
				found = found.replaceAll(tags, '');
				item[key.name] = found; // store data with short-key
			}
			items.push(item);
		}
		console.log(`${items.length} records have been found`);
		let index = Fuse.createIndex(opts.keys, items);
		this.serialized = {
			items:   JSON.stringify(items),
			index:   JSON.stringify(index.toJSON()),
			options: JSON.stringify(opts)
		};
		return this.serialized;
	}
}

module.exports = SearchDB;