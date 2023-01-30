/*!
 * gulp tasks for docolatte
 * @author amekusa
 */

const { dirname } = require('node:path');

const g = require('gulp');
const s = g.series;
const p = g.parallel;
const _if = require('gulp-if');
const _rename = require('gulp-rename');

const { rollup } = require('rollup');
const nodeResolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');

const u = require('./util');

const base = dirname(__dirname);
const paths = {
	src: {
		scripts: base + '/static/_src/scripts',
		styles:  base + '/static/_src/styles',
		test: base + '/fixtures'
	},
	scripts: base + '/static/scripts',
	styles:  base + '/static/styles',
	tmpl: base + '/tmpl',
	test: base + '/fixtures-doc',
	manifest: base + '/package.json'
};

const pkg = require(paths.manifest);
paths.test += '/' + pkg.name;

const t = { // minor tasks
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

	js_main_watch() {
		return g.watch([paths.src.scripts + '/main.js'], t.js_main);
	},

	js_minify() {
		let dst = `${paths.scripts}/`;
		let src = [`${paths.scripts}/*.js`, `!${paths.scripts}/*.min.js`];
		let opts = {};
		return g.src(src)
			.pipe(u.modify((data, enc) => {
				return u.minifyJS(data, enc, opts).then(r => {
					console.log('stats:', r.stats.summary);
					return r.data;
				});
			}))
			.pipe(_rename({ extname: '.min.js' }))
			.pipe(g.dest(dst));
	},

	js_clean() {
		return u.clean(`${paths.scripts}`);
	},

	css_main() {
		let dst = `${paths.styles}/theme.css`;
		let src = `${paths.src.styles}/theme.less`;
		return u.exec(`lessc --source-map '${src}' '${dst}'`);
	},

	css_main_watch() {
		return g.watch([paths.src.styles + '/*.less'], t.css_main);
	},

	css_minify() {
		let dst = `${paths.styles}/`;
		let src = [`${paths.styles}/theme.css`];
		let opts = {
			inline: ['all'],
			level: 1
		};
		return g.src(src)
			.pipe(u.modify((data, enc) => {
				return u.minifyCSS(data, enc, opts).then(r => {
					console.log('stats:', r.stats.summary);
					return r.data;
				});
			}))
			.pipe(_rename({ extname: '.min.css' }))
			.pipe(g.dest(dst));
	},

	css_clean() {
		return u.clean(`${paths.styles}`);
	},

	test_gen() {
		return u.exec(`jsdoc -c '${base}/fixtures.json' && cd '${paths.test}' && ln -sfn '${pkg.version}' latest`);
	},

	test_gen_watch() {
		let watch = [
			paths.manifest,
			paths.src.test + '/**/*',
			paths.scripts + '/*.js',
			paths.styles + '/*.css',
			paths.tmpl + '/*.tmpl',
			base + '/README.md',
			base + '/publish.js'
		];
		return g.watch(watch, t.test_gen);
	},

	test_run() {
		return u.exec(`http-server '${paths.test}/latest' -c-1`);
	},

	test_clean() {
		return u.exec(`[ ! -d '${paths.test}' ] || rm -rf '${paths.test}'`);
	},
};

// major tasks
const x = {};
x.js = t.js_main;
x.css = t.css_main;
x.build = p(x.js, x.css);
x.test = s(t.test_gen, t.test_run);
x.clean = p(t.js_clean, t.css_clean, t.test_clean);

x.default = s(
	p(
		s(t.js_clean, x.js, t.js_minify),
		s(t.css_clean, x.css, t.css_minify)
	),
	s(t.test_clean, t.test_gen)
);

x.watch = s(
	x.build,
	t.test_gen,
	p(
		t.test_run,
		t.js_main_watch,
		t.css_main_watch,
		t.test_gen_watch
	)
);

module.exports = x;
