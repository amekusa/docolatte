const helper = require('jsdoc/util/templateHelper');
const Fuse = require('fuse.js');

/**
 * Search database.
 * @author amekusa
 */
class SearchDB {
	/**
	 * @param {object} opts - Options
	 */
	constructor(opts) {
		this.options = opts;
		this.records = [];
	}
	/**
	 * Feeds a new record.
	 * @param {object|object[]} record
	 */
	feed(record) {
		if (Array.isArray(record)) {
			for (let item of record) this.feed(item);
			return;
		}
		if (this.has(record)) {
			console.warn('[SearchDB]', 'duplicated feed:', record);
			return;
		}
		this.records.push(record);
	}
	/**
	 * Checks if the given record already exists.
	 * @param {object} record
	 * @return {boolean}
	 */
	has(record) {
		let key = '___id';
		if (!(key in record)) return false;
		for (let item of this.records) {
			if (!(key in item)) continue;
			if (record[key] === item[key]) return true;
		}
		return false;
	}
	/**
	 * Serializes all the records into JSON format.
	 * @return {object}
	 */
	serialize() {
		console.log(`Serializing search DB...`);
		let list = [];
		for (let record of this.records) {
			let item = { url: helper.createLink(record) };
			for (let key of this.options.keys) {
				if (!(key.name in record)) continue;
				item[key.name] = record[key.name];
			}
			list.push(item);
		}

		let index = Fuse.createIndex(this.options.keys, list);
		console.log(`${list.length} records have been found`);

		return {
			list: JSON.stringify(list),
			index: JSON.stringify(index.toJSON()),
			options: JSON.stringify(this.options)
		};
	}
}

module.exports = SearchDB;