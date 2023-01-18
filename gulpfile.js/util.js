/*!
 * gulp utils
 * @author amekusa
 */

const { exec } = require('node:child_process');
const { Transform } = require('node:stream');

const { minify } = require('terser');
const CleanCSS = require('clean-css');

class MinifyStats {
	constructor() {
		this.startedAt;
		this.endedAt;
		this.elapsed;
		this.originalSize;
		this.minifiedSize;
	}
	get elapsedSeconds() {
		return this.elapsed / 1000;
	}
	get efficiency() {
		return 1.0 - (this.minifiedSize / this.originalSize);
	}
	get summary() {
		return {
			originalSize: this.originalSize,
			minifiedSize: this.minifiedSize,
			efficiency: this.efficiency,
			elapsedSeconds: this.elapsedSeconds
		};
	}
	before(data, enc) {
		this.originalSize = x.bytes(data, enc);
		return this;
	}
	after(data, enc) {
		this.minifiedSize = x.bytes(data, enc);
		return this;
	}
	start() {
		this.startedAt = Date.now();
		return this;
	}
	end() {
		this.endedAt = Date.now();
		this.elapsed = this.endedAt - this.startedAt;
		return this;
	}
}

const x = {

	/**
	 * @return {Promise}
	 */
	exec(cmd) {
		return new Promise((resolve, reject) => {
			exec(cmd, (err, stdout, stderr) => {
				if (err) reject(stderr);
				resolve(stdout);
			});
		});
	},

	/**
	 * @return {Promise}
	 */
	clean(dir, fn, depth = 1) {
		return this.exec(`find '${dir}' -type f -maxdepth ${depth} -delete`, fn);
	},

	bytes(str, enc) {
		return Buffer.byteLength(str, enc);
	},

	/**
	 * Returns a Transform stream object with the given function as its transform() method.
	 * `fn` must return a string which is to be the new content, or a Promise which resolves a string.
	 * @param {function} fn
	 * @return {Transform}
	 * @author amekusa
	 */
	modify(fn) {
		return new Transform({
			objectMode: true,
			transform(file, enc, done) {
				let r = fn(file.contents.toString(enc), enc);
				if (r instanceof Promise) {
					r.then(modified => {
						file.contents = Buffer.from(modified, enc);
						this.push(file);
						done();
					});
				} else {
					file.contents = Buffer.from(r, enc);
					this.push(file);
					done();
				}
			}
		});
	},

	/**
	 * @param {string} data - JS code
	 * @param {string} enc
	 * @param {object} opts
	 * @return {Promise}
	 */
	minifyJS(data, enc, opts) {
		let stats = new MinifyStats();
		stats.before(data, enc).start();
		return minify(data, opts).then(r => {
			stats.end().after(r.code, enc);
			return { data: r.code, stats };
		});
	},

	/**
	 * @param {string} data - CSS code
	 * @param {string} enc
	 * @param {object} opts
	 * @return {Promise}
	 */
	minifyCSS(data, enc, opts) {
		let stats = new MinifyStats();
		stats.before(data, enc).start();
		return new Promise((resolve, reject) => {
			let r = new CleanCSS(opts).minify(data);
			if (r.errors.length) reject(r.errors);
			stats.end().after(r.styles, enc);
			resolve({ data: r.styles, stats });
		});
	},
};

module.exports = x;
