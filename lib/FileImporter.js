const path = require('path');
const { existsSync, copyFileSync, writeFileSync } = require('fs');
const { mkPath } = require('jsdoc/fs');
const { error, arr, map, ext, splitLast } = require('./Util');

/**
 * File importer.
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
class FileImporter {
	/**
	 * @param {object} config
	 * @param {boolean} [config.minify=false] - Prefer `*.min.*` version
	 * @param {string} config.src - Source dir to search
	 * @param {string} config.dst - Destination dir
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
	 * Adds a new item to import.
	 * @param {string|string[]|object|object[]} newImport
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
			if (!('src' in item)) throw error(`'src' property is missing`);
			this.queue.push(Object.assign({
				order: 0,
				resolve: 'local',
				private: false,
			}, item));
		}
	}
	/**
	 * Resolves the location of the given file path
	 * @param {string} file - File path
	 * @param {string} method - Resolution method
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
				try { r = require.resolve(find[i]); } catch (e) {
					if (e.code == 'MODULE_NOT_FOUND') continue;
					throw e;
				}
				return r;
			case 'local':
				r = path.join(this.config.src, find[i]);
				if (existsSync(r)) return r;
				break;
			case 'local:absolute':
			case 'local:abs':
				r = find[i];
				if (existsSync(r)) return r;
				break;
			default:
				throw error(`invalid resolution method: ${method}`);
			}
		}
		throw error(`cannot resolve '${file}'`);
	}
	/**
	 * Imports all items in the queue at once.
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

				console.log('---- File Link ----');
				console.log(' type:', type);
				console.log('  src:', src);

			} else { // needs resolution
				let { dst:dstDir, as:dstFile } = item;
				let create = item.resolve == 'create'; // needs creation?
				if (create) {
					if (!dstFile) throw error(`'as' property is required with { resolve: 'create' }`);
				} else {
					src = this.resolve(src, item.resolve);
					if (!dstFile) dstFile = path.basename(src);
				}
				// file type
				if (!type) type = map(ext(dstFile), typeMap);
				// destination dir
				if (!dstDir) dstDir = type + 's';
				// absolute destination
				url = path.join(dstDir, dstFile);
				let dst = path.join(this.config.dst, url);

				mkPath(path.dirname(dst));

				if (create) {
					writeFileSync(dst, src);
					console.log('---- File Creation ----');
					console.log(' type:', type);
					console.log('  dst:', dst);
				} else {
					copyFileSync(src, dst);
					console.log('---- File Import ----');
					console.log(' type:', type);
					console.log('  src:', src);
					console.log('  dst:', dst);
				}
			}

			if (!item.private) {
				if (!(type in this.results)) this.results[type] = [];
				this.results[type].push({ type, url });
			}
		}
	}
}

module.exports = FileImporter;
