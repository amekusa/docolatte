/*!
 * gulp utils
 * @author amekusa
 */

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
		this.originalSize = Buffer.byteLength(data, enc);
		return this;
	}
	after(data, enc) {
		this.minifiedSize = Buffer.byteLength(data, enc);
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

const X = {

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

module.exports = X;
