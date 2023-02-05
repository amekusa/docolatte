const fs = require('jsdoc/fs');
const path = require('jsdoc/path');

const { merge } = require('./util');
const TmplUtil = require('./TmplUtil');
const SearchDB = require('./SearchDB');

/**
 * This class provides Docolatte specific features
 * @author amekusa
 */
class Docolatte {
	static create() {
		return new this();
	}
	constructor() {
		this.tmpl; // template helper
		this.searchDB; // search database

		this.config = { // default config
			minify: true,
			import: [],
			meta: {
				lang: 'en',
				title: null,
				description: null,
				keywords: null,
				author: null,
				favicon: []
			},
			branding: {
				title: 'My Project',
				link: 'index.html',
				icon: 'home',
				font: {
					size: null,
					family: null
				}
			},
			home: {
				package: {
					hide: false
				}
			},
			readme: {
				truncate: true
			},
			footer: {
				hide: false,
				copyright: null,
				license: null,
				hideGenerator: false
			},
			code: {
				theme: 'base16/espresso'
			}
		};

		// actions to perform at certain points in publish.js
		this.actions = {
			CONFIG_READY: config => {
				// configure this theme
				this.configure(config.docolatte);
			},
			OUTDIR_READY: outdir => {
				// copy files from node_modules
				let min = this.config.minify ? '.min' : '';
				let moduleFiles = [
					{ dst: 'assets', src: 'feather-icons/dist/feather-sprite.svg' },
					{ dst: 'styles', src: `simplebar/dist/simplebar${min}.css` }
				];
				if (this.config.code.theme) {
					moduleFiles.push({
						dst: path.join('styles/hljs', path.dirname(this.config.code.theme)),
						src: `highlight.js/styles/${this.config.code.theme}.css`
					});
				}
				moduleFiles.forEach(file => {
					let dst = path.join(outdir, file.dst);
					let src = require.resolve(file.src);
					fs.mkPath(dst);
					fs.copyFileSync(src, dst);
				});
			},
			DATA_READY: (data, opts) => {
				let { members } = opts;

				// initialize search database
				this.searchDB = new SearchDB({
					keys: [
						{ name: 'name',        weight: 10 },
						{ name: 'longname',    weight: 9 },
						{ name: 'classdesc',   weight: 6 },
						{ name: 'description', weight: 6 },
						{ name: 'examples',    weight: 1 },
					]
				});
				// feed records to the DB
				data({
					kind: ['member', 'function', 'constant', 'typedef'],
					memberof: { isUndefined: false } // not global
				}).each(item => {
					this.searchDB.feed(item);
				});
				for (let key in members) {
					this.searchDB.feed(members[key]);
				}
			},
			TEMPLATES_READY: tmpl => {
				this.tmpl = tmpl; // save template helper

				// expand the template helper
				tmpl.u = new TmplUtil();
				tmpl.theme = {
					config: this.config,
					search: this.searchDB.serialize()
				};
			}
		};

		// filters to apply to HTML contents
		this.filters = {
			USER_HTML: r => {
				// wrap tables with .table-wrap
				r = r.replaceAll(/(<table(\s+\S+?)?>)/gs, '<div class="table-wrap">$1');
				r = r.replaceAll('</table>', '</table></div>');
				return r;
			},
			README: r => {
				// truncate README
				if (this.config.readme.truncate) r = r.replaceAll(/<!--+\s*TRUNCATE:START\s*--+>.*?<!--+\s*TRUNCATE:END\s*--+>/gs, '<!-- TRUNCATED -->');
				return r;
			},
			FINAL: r => {
				// insert search data JSONs
				r = r.replace('<!-- %DOCOLATTE::DATA_GOES_HERE% -->', this.tmpl.partial('data.tmpl'));
				return r;
			}
		};
	}
	/**
	 * Configures this theme
	 * @param {object} [config]
	 * @return {object}
	 */
	configure(config = null) {
		let r = merge(this.config, config || {});

		if (!r.meta.title) r.meta.title = r.branding.title;
		if (!Array.isArray(r.meta.favicon)) r.meta.favicon = [r.meta.favicon];

		// custom styles
		r.style = '';
		if (r.branding.font.size || r.branding.font.family) {
			r.style += `.masthead .branding .title { `;
			if (r.branding.font.size)   r.style += `font-size: ${r.branding.font.size}; `;
			if (r.branding.font.family) r.style += `font-family: ${r.branding.font.family}; `;
			r.style += `}`;
		}

		this.config = r;
		return r;
	}
	/**
	 * @param {string} on
	 * @param {...any} args
	 */
	action(on, ...args) {
		if (on in this.actions) return this.actions[on](...args);
		console.warn(`[WARN] no action for`, on);
		return undefined;
	}
	/**
	 * @param {string|string[]} context
	 * @param {string} content
	 * @return {string}
	 */
	filter(context, content) {
		let r = content;
		for (let ctx of (Array.isArray(context) ? context : [context])) {
			if (ctx in this.filters) r = this.filters[ctx](r);
			else console.warn(`[WARN] no filter for`, ctx);
		}
		return r;
	}
}

module.exports = Docolatte;