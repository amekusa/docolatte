const Fuse = require('fuse.js');
const dig = require('obj-digger');
const $ = require('./Util');

/**
 * Search database.
 * @author amekusa
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

		let keys = [];
		let keyMap = {};
		let digits = 'abcdefghijklmnopqrstuvwxyz';
		for (let i = 0; i < this.options.keys.length; i++) {
			let key = Object.assign({}, this.options.keys[i]); // clone
			key.name = $.base(i, digits);
			keys.push(key);
			keyMap[key.name] = this.options.keys[i].name;
		}
		/* NOTE:
		 * Reduced each key name to a single char (a-z)
		 * like this:
		 *   keys = [
		 *     { name: a, weight: ... },
		 *     { name: b, weight: ... },
		 *     { name: c, weight: ... },
		 *     ...
		 *   ]
		 */

		let items = [];
		for (let i = 0; i < this.records.length; i++) {
			let record = this.records[i];
			let link   = this.links[i];
			let item = { $: [link.url, link.label] };
			for (let key of keys) {
				let { found } = dig(record, keyMap[key.name]);
				if (!found) continue;
				item[key.name] = found;
			}
			items.push(item);
		}
		let index = Fuse.createIndex(keys, items);
		console.log(`${items.length} records have been found`);
		this.serialized = {
			items:   JSON.stringify(items),
			index:   JSON.stringify(index.toJSON()),
			options: JSON.stringify($.merge($.clone(this.options), { keys }))
		};
		return this.serialized;
	}
}

module.exports = SearchDB;