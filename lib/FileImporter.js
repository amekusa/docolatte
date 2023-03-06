const path = require('path');
const { existsSync, copyFileSync } = require('fs');
const { mkPath } = require('jsdoc/fs');
const { error, arr, map, ext, splitExt } = require('./util');

// default values
const DEF = {
	config: {
		minify: false,
		src: '', // source dir to search
		dst: '', // destination dir
	},
	import: {
		module: false,
		private: false,
		priority: 10,
	},
};

/**
 * @author amekusa
 */
class FileImporter {
	/**
	 * @param {object} config
	 */
	constructor(config) {
		this.config = Object.assign(DEF.config, config);
		this.imports = [];
		this.imported = [];
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
				if (Array.isArray(item)) throw error(`invalid type (array)`);
				break;
			default:
				throw error(`invalid type (${typeof item})`);
			}
			if (!item.src) throw error(`'src' property is missing`);
			this.imports.push(Object.assign(DEF.import, item));
		}
	}
	/**
	 * @param {string} file
	 * @param {bool} [module=false]
	 * @return {string} Resolved file path
	 */
	resolve(file, module = false) {
		let find = [];
		if (this.config.minify) {
			let f = splitExt(file);
			find.push(`${f.name}.min${f.ext}`);
		}
		find.push(file);
		for (let i = 0; i < find.length; i++) {
			let r;
			if (module) {
				r = require.resolve(find[i]);
				if (r) return r;
			} else {
				r = path.join(this.config.src, find[i]);
				if (existsSync(r)) return r;
			}
		}
		throw error(`cannot resolve '${file}'`);
	}
	/**
	 * Imports all at once
	 */
	import() {
		// sort by priority
		this.imports.sort((a, b) => (Number(a.priority) - Number(b.priority)));

		while (this.imports.length) {
			let { src, dst:dstDir, as:dstFile, type, module, private } = this.imports.shift();

			// source file
			src = this.resolve(src, module);

			// destination filename
			if (!dstFile) dstFile = path.basename(src);

			// file type
			if (!type) type = map(ext(dstFile), {
				css: 'style',
				js: 'script'
			}, 'asset');

			// destination dir
			if (!dstDir) dstDir = type + 's';

			// absolute destination
			let dst = path.join(this.config.dst, dstDir, dstFile);

			console.log('---- File Import ----')
			console.log(' type:', type);
			console.log('  src:', src);
			console.log('  dst:', dst);

			mkPath(path.dirname(dst));
			copyFileSync(src, dst);

			if (!private) {
				this.imported.push({
					type: type,
					path: path.join(dstDir, dstFile)
				});
			}
		}
	}
}

module.exports = FileImporter;
