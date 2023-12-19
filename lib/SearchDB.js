const Fuse = require('fuse.js');

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
		// console.table(this.records, ['___id', 'kind', 'longname', 'memberof']);
		let items = [];
		for (let i = 0; i < this.records.length; i++) {
			let record = this.records[i];
			let link   = this.links[i];
			let item = { $: [link.url, link.label] };
			for (let key of this.options.keys) {
				if (!(key.name in record)) continue;
				item[key.name] = record[key.name]; // TODO: fix
			}
			items.push(item);
		}
		let index = Fuse.createIndex(this.options.keys, items);
		console.log(`${items.length} records have been found`);
		this.serialized = {
			items:   JSON.stringify(items),
			index:   JSON.stringify(index.toJSON()),
			options: JSON.stringify(this.options)
		};
		return this.serialized;
	}
}

module.exports = SearchDB;