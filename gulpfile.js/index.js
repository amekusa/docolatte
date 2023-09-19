/*!
 * Gulp tasks for Docolatte
 * @author amekusa
 */

const // node
	{ chdir, env } = require('node:process'),
	{ dirname, basename } = require('node:path');

const // gulp
	$ = require('gulp'),
	$rename = require('gulp-rename'),
	$S = $.series,
	$P = $.parallel;

const // rollup
	{ rollup } = require('rollup'),
	rNode = require('@rollup/plugin-node-resolve'),
	rCJS = require('@rollup/plugin-commonjs');

const // misc
	{ io, sh } = require('@amekusa/nodeutil'),
	less = require('less'),
	bs = require('browser-sync').create();

const // lib
	U = require('./util');

const // shortcuts
	{ log, debug, warn, error } = console;

// project root
const home = dirname(__dirname); chdir(home);

// package info
const pkg = require(`${home}/package.json`);

const paths = {
	src: {
		scripts:  'static/_src/scripts',
		styles:   'static/_src/styles',
		fixtures: 'fixtures'
	},
	scripts:  'static/scripts',
	styles:   'static/styles',
	fixtures: 'fixtures-doc',
	tmpl:     'tmpl'
};

const ctx = {
	rConf: null, // rollup config
};

/**
 * Tasks
 */
const T = {

	default(done) {
		log(' :: Gulp - Available Tasks:');
		for (let key in $.registry().tasks()) log(key);
		done();
	},

	js_build() {
		let conf = ctx.rConf;
		if (conf) {
			if (typeof conf.cache == 'object') log(' :: Rollup - Cache Used');

		} else conf = {
			input: `${paths.src.scripts}/main.js`,
			output: {
				file: `${paths.scripts}/docolatte.js`,
				name: 'docolatte',
				format: 'iife',
				sourcemap: !sh.prod(),
				indent: false,
			},
			plugins: [
				rNode({
					browser: true,
				}),
				rCJS(),
			],
			treeshake: sh.prod(),
			cache: true,
		};

		return rollup(conf).then(bundle => {
			if (bundle.cache) {
				conf.cache = bundle.cache;
				log(' :: Rollup - Cache Stored');
			}
			ctx.rConf = conf;
			return bundle.write(conf.output);
		}).then(bs.reload);
	},

	js_minify() {
		let dst = `${paths.scripts}/`;
		let src = [
			`${paths.scripts}/*.js`,
			`!${paths.scripts}/*.min.js`,
		];
		let opts = {};
		return $.src(src)
			.pipe(io.stream.modify((data, enc) => {
				return U.minifyJS(data, enc, opts).then(r => {
					log(' :: Minify - Stats:', r.stats.summary);
					return r.data;
				});
			}))
			.pipe($rename({ extname: '.min.js' }))
			.pipe($.dest(dst));
	},

	js_clean() {
		return io.rm(paths.scripts);
	},

	css_build() {
		let dst = `${paths.styles}/docolatte.css`;
		let src = `${paths.src.styles}/theme.less`;
		return sh.exec(`lessc --source-map '${src}' '${dst}'`);
	},

	css_minify() {
		let dst = paths.styles;
		let src = `${paths.styles}/docolatte.css`;
		let opts = {
			inline: ['all'],
			level: 1,
		};
		return $.src(src)
			.pipe(io.stream.modify((data, enc) => {
				return U.minifyCSS(data, enc, opts).then(r => {
					log(' :: Minify - Stats:', r.stats.summary);
					return r.data;
				});
			}))
			.pipe($rename({ extname: '.min.css' }))
			.pipe($.dest(dst));
	},

	css_clean() {
		return io.rm(paths.styles);
	},

	fixtures_build() {
		return sh.exec('jsdoc -c fixtures.json').then(bs.reload);
	},

	fixtures_clean() {
		return io.rm(paths.fixtures);
	},

	fixtures_serve(done) {
		return bs.active ? done() : bs.init({
			open: false,
			server: {
				baseDir: paths.fixtures,
				index: 'index.html'
			}
		}, done);
	},

	watch() {
		// auto-build js
		$.watch([
			`${paths.src.scripts}/main.js`
		], T.js_build);

		// auto-build css
		$.watch([
			`${paths.src.styles}/*.less`
		], T.css_build);

		// auto-build fixtures
		$.watch([
			`${paths.src.fixtures}/**/*`,
			`${paths.tmpl}/*.tmpl`,
			'package.json',
			'fixtures.json',
			'README.md',
			'publish.js',
			'lib/*.{js,json}',
		], T.fixtures_build);

		// copy scripts/styles to fixtures on change
		$.watch([
			`${paths.src.scripts}/**/*`,
			`${paths.src.styles}/**/*`,
			`${paths.scripts}/**/*`,
			`${paths.styles}/**/*`,
		]).on('change', src => {
			let dst = src.replace(/^static\//, `${paths.fixtures}/`);
			sh.exec(`cp '${src}' '${dst}'`).then(() => {
				log(' :: File - Copied:');
				log('  src:', src);
				log('  dst:', dst);
				if (!dst.match(/\/_src\//) && dst.match(/\.(js|css)$/)) {
					log(' :: Browsersync - Reload:', dst);
					bs.reload(basename(dst));
				}
			});
		});
	},
};

/**
 * Private Tasks
 */
const t = {
	env_prod(done) {
		sh.prod(true);
		log(' :: Env. > Production');
		done();
	},
	env_dev(done) {
		sh.dev(true);
		log(' :: Env. > Development');
		done();
	},
};

/**
 * Composite Tasks
 */
T.js = $S(
	T.js_clean,
	T.js_build,
	T.js_minify
);
T.css = $S(
	T.css_clean,
	T.css_build,
	T.css_minify
);
T.fixtures = $S(
	T.fixtures_clean,
	T.fixtures_build,
	T.fixtures_serve
);
T.clean = $P(
	T.js_clean,
	T.css_clean,
	T.fixtures_clean
);
T.build = $S(
	$P(
		T.js,
		T.css
	),
	T.fixtures_clean,
	T.fixtures_build
);
T.dev = $S(
	t.env_dev,
	T.build,
	T.fixtures_serve,
	T.watch
);
T.dist = $S(
	t.env_prod,
	T.build
);

module.exports = T;
