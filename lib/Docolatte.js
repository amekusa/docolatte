const { copyFileSync } = require('fs');
const { mkPath } = require('jsdoc/fs');
const path = require('path');

const EmojiConvertor = require('emoji-js');

const { error, arr, merge } = require('./util');
const TmplUtil = require('./TmplUtil');
const SearchDB = require('./SearchDB');
const FileImporter = require('./FileImporter');
const Defaults = require('./defaults.json');

/**
 * This class provides Docolatte specific features
 * @author amekusa
 */
class Docolatte {
	static new() {
		return new this();
	}
	constructor() {
		this.env;      // environment
		this.tmpl;     // template helper
		this.searchDB; // search database
		this.importer; // file importer
		this.emoji;    // emoji convertor
		this.config = Defaults.templates.docolatte;

		// actions to perform at certain points in publish.js
		this.actions = {
			INIT: (env, opts) => {
				let { config } = opts;
				this.env = env;
				this.configure(config.docolatte);
			},
			OUTDIR_READY: outdir => {
				this.importer = new FileImporter({
					minify: this.config.minify,
					src: this.env.pwd,
					dst: outdir
				});
				// modules
				this.importer.add([
					{ resolve: 'module', src: 'simplebar/dist/simplebar.css' },
				]);
				if (this.config.code.theme) {
					this.importer.add({
						resolve: 'module',
						src: `highlight.js/styles/${this.config.code.theme}.css`,
						dst: 'styles/hljs', as: `${this.config.code.theme}.css`
					});
				}
				// static files
				let min = this.config.minify ? '.min' : '';
				this.importer.add([
					{ resolve: false, src: `scripts/docolatte${min}.js` },
					{ resolve: false, src: `styles/docolatte${min}.css` },
				]);
				// user specified files
				if (this.config.imports) this.importer.add(this.config.imports);
				// import all
				this.importer.import();
			},
			DATA_READY: (data, opts) => {
				let { members } = opts;
				// scan over all doclets
				data().each(item => {
					if (item.examples) { // example codes
						// set language of each code
						let fileLang = (item.meta && item.meta.filename) ? lang(item.meta.filename) : '';
						for (let ex of item.examples) {
							// find '{@lang <language>}' tag
							let find = /{@lang\s+(\S+?)}\n?/;
							let found = ex.code.match(find);
							if (found) {
								ex.lang = found[1];
								ex.code = ex.code.replace(find, '');
							} else ex.lang = fileLang; // use file language
						}
					}
				});
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
					files:  this.importer.results,
					search: this.searchDB.serialize()
				};
			}
		};

		// filters to apply to contents
		this.filters = {
			SOURCE_DOCLET: (r, opts) => {
				// set language of the source
				r.lang = lang(opts.file);
				return r;
			},
			README_HTML: r => {
				// truncate
				if (this.config.readme.truncate) r = r.replaceAll(/<!--+\s*TRUNCATE:START\s*--+>.*?<!--+\s*TRUNCATE:END\s*--+>/gs, '<!-- TRUNCATED -->');
				// wrap tables with .table-wrap
				r = r.replaceAll(/(<table(\s+\S+?)?>)/gs, '<div class="table-wrap">$1');
				r = r.replaceAll('</table>', '</table></div>');
				// convert emoji
				r = this.replaceEmoji(r, this.config.readme.emoji);
				return r;
			},
			FINAL_HTML: r => {
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
			r.style += `.header .masthead .title { `;
			if (r.branding.font.size)   r.style += `font-size: ${r.branding.font.size}; `;
			if (r.branding.font.family) r.style += `font-family: ${r.branding.font.family}; `;
			r.style += `}`;
		}

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
	 * @param {any} content
	 * @param {object} [opts]
	 * @return {any}
	 */
	filter(context, content, opts = null) {
		let r = content;
		for (let ctx of (Array.isArray(context) ? context : [context])) {
			if (ctx in this.filters) r = this.filters[ctx](r, opts);
			else console.warn(`[WARN] no filter for`, ctx);
		}
		return r;
	}
	/**
	 * @param {string} str
	 * @param {object} conf
	 * @return {string}
	 */
	replaceEmoji(str, conf) {
		let r = str;
		if (!conf.replace) return r;
		if (!this.emoji) this.emoji = new EmojiConvertor();
		if (conf.options) {
			for (let key in conf.options) {
				if (!this.emoji.hasOwnProperty(key) || typeof this.emoji[key] == 'function') throw `invalid EmojiConvertor option '${key}'`;
				this.emoji[key] = conf.options[key];
			}
		}
		for (let each of arr(conf.replace)) {
			let fn = 'replace_' + each;
			if (typeof this.emoji[fn] != 'function') throw `invalid EmojiConvertor function '${fn}'`;
			r = this.emoji[fn](r);
		}
		return r;
	}
}

/**
 * Returns the language of the given file
 * @return {string}
 */
function lang(file) {
    let ext = path.extname(file);
    return ext.length > 1 ? ext.substring(1) : '';
}

module.exports = Docolatte;