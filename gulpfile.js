const { Transform } = require('node:stream');
const { exec } = require('node:child_process');

const g = require('gulp');
const s = g.series;
const p = g.parallel;
const _if = require('gulp-if');
const _rename = require('gulp-rename');

const { rollup } = require('rollup');
const nodeResolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

const { minify } = require('terser');
const CleanCSS = require('clean-css');

const base = __dirname;
const mods = base + '/node_modules';

// To switch to production mode: export NODE_ENV=prod
const prod = process.env.NODE_ENV == 'prod';

const paths = {
	src: {
		scripts: base + '/static/_src/scripts',
		styles:  base + '/static/_src/styles'
	},
	scripts: base + '/static/scripts',
	styles:  base + '/static/styles'
};

function clean(dir, fn, depth = 1) {
	return exec(`find '${dir}' -type f -maxdepth ${depth} -delete`, fn);
}

function bytes(str, enc) {
	return Buffer.byteLength(str, enc);
}

/**
 * Returns a Transform stream object with the given function as its transform() method.
 * `fn` must return a string which is to be the new content, or a Promise which resolves a string.
 * @param {function} fn
 * @return {Transform}
 * @author amekusa
 */
function modify(fn) {
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
}

t = { // minor tasks
	async js_main() {
		let conf = {
			input: paths.src.scripts + '/main.js',
			output: {
				dir: paths.scripts,
				name: 'docolatte',
				format: 'iife',
				sourcemap: true
			},
			plugins: [
				nodeResolve(),
				commonjs()
			]
		};
		let bundle = await rollup(conf);
		return bundle.write(conf.output);
	},

	async js_hljs() {
		let conf = {
			input: paths.src.scripts + '/highlight.js',
			output: {
				dir: paths.scripts,
				name: 'hljs',
				format: 'iife'
			},
			plugins: [
				nodeResolve(),
				commonjs()
			]
		};
		let bundle = await rollup(conf);
		return bundle.write(conf.output);
	},

	js_minify() {
		let dst = `${paths.scripts}/`;
		let src = [`${paths.scripts}/*.js`, `!${paths.scripts}/*.min.js`];
		let opts = {};
		return g.src(src)
			.pipe(modify((content, enc) => {
				return minify(content, opts).then(r => {
					let stats = {
						originalSize: bytes(content, enc),
						minifiedSize: bytes(r.code, enc)
					};
					stats.efficiency = stats.minifiedSize / stats.originalSize;
					console.log('stats:', stats);
					return r.code;
				});
			}))
			.pipe(_rename({ extname: '.min.js' }))
			.pipe(g.dest(dst));
	},

	js_clean(done) {
		return clean(`${paths.scripts}`, err => {
			if (err) throw err;
			done();
		});
	},

	css_main(done) {
		let dst = `${paths.styles}/theme.css`;
		let src = `${paths.src.styles}/theme.less`;
		return exec(`lessc --source-map '${src}' '${dst}'`, err => {
			if (err) throw err;
			done();
		});
	},

	css_minify() {
		let dst = `${paths.styles}/`;
		let src = [`${paths.styles}/theme.css`];
		let opts = {
			inline: ['all'],
			level: 1
		};
		return g.src(src)
			.pipe(modify((content, enc) => {
				let r = new CleanCSS(opts).minify(content);
				if (r.errors.length) throw r.errors;
				if (r.warnings.length) console.warn(r.warnings);
				console.log('stats:', r.stats);
				return r.styles;
			}))
			.pipe(_rename({ extname: '.min.css' }))
			.pipe(g.dest(dst));
	},

	css_clean(done) {
		return clean(`${paths.styles}`, err => {
			if (err) throw err;
			done();
		});
	}
};

// major tasks
const tasks = exports;

tasks.js = p(t.js_main, t.js_hljs);
tasks.css = p(t.css_main);
tasks.build = p(tasks.js, tasks.css);
tasks.clean = p(t.js_clean, t.css_clean);

tasks.default = p(
	s(t.js_clean, tasks.js, t.js_minify),
	s(t.css_clean, tasks.css, t.css_minify)
);
