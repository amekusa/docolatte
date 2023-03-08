const path = require('path');
const { existsSync, copyFileSync } = require('fs');
const { mkPath } = require('jsdoc/fs');
const { error, arr, map, ext, splitLast } = require('./util');

/**
 * @author amekusa
 */
class FileImporter {
	/**
	 * @param {object} config
	 */
	constructor(config) {
		this.config = Object.assign({
			minify: false,
			src: '', // source dir to search
			dst: '', // destination dir
		}, config);
		this.queue = [];
		this.results = {
			script: [],
			style:  [],
			asset:  [],
		};
	}
	/**
	 * @param {object|object[]} newImport
	 */
	add(newImport) {
		for (let item of arr(newImport)) {
			switch (typeof item) {
			case 'string':
				item = { src: item };
				break;
			case 'object':
				if (Array.isArray(item)) throw error(`invalid type: array`);
				break;
			default:
				throw error(`invalid type: ${typeof item}`);
			}
			if (!item.src) throw error(`'src' property is missing`);
			this.queue.push(Object.assign({
				order: 0,
				resolve: 'local',
				private: false,
			}, item));
		}
	}
	/**
	 * @param {string} file
	 * @param {string} method Resolution method
	 * @return {string} Resolved file path
	 */
	resolve(file, method) {
		let find = [];
		if (this.config.minify) {
			let f = splitLast(file, '.');
			find.push(`${f[0]}.min${f[1]}`);
		}
		find.push(file);
		for (let i = 0; i < find.length; i++) {
			let r;
			switch (method) {
			case 'module':
				try { r = require.resolve(find[i]) } catch (e) {
					if (e.code == 'MODULE_NOT_FOUND') continue;
					throw e;
				}
				return r;
			case 'local':
				r = path.join(this.config.src, find[i]);
				if (existsSync(r)) return r;
				break;
			default:
				throw error(`invalid resolution method: ${method}`);
			}
		}
		throw error(`cannot resolve '${file}'`);
	}
	/**
	 * Imports all items in the queue at once
	 */
	import() {
		let typeMap = { css:'style', js:'script', _default:'asset' };
		this.queue.sort((a, b) => (Number(a.order) - Number(b.order))); // sort by order
		while (this.queue.length) {
			let item = this.queue.shift();
			let { type, src } = item;
			let url;

			if (!item.resolve) { // no resolution
				url = src;
				if (!type) type = map(ext(src), typeMap);

				console.log('---- File Link ----')
				console.log(' type:', type);
				console.log('  src:', src);

			} else { // needs resolution
				let { dst:dstDir, as:dstFile } = item;
				src = this.resolve(src, item.resolve);
				// destination filename
				if (!dstFile) dstFile = path.basename(src);
				// file type
				if (!type) type = map(ext(dstFile), typeMap);
				// destination dir
				if (!dstDir) dstDir = type + 's';
				// absolute destination
				url = path.join(dstDir, dstFile);
				let dst = path.join(this.config.dst, url);

				console.log('---- File Import ----')
				console.log(' type:', type);
				console.log('  src:', src);
				console.log('  dst:', dst);

				mkPath(path.dirname(dst));
				copyFileSync(src, dst);
			}

			if (!item.private) {
				if (!(type in this.results)) this.results[type] = [];
				this.results[type].push({ type, url });
			}
		}
	}
}

module.exports = FileImporter;
