const { copyFileSync } = require('fs');
const { mkPath } = require('jsdoc/fs');
const path = require('path');

const EmojiConvertor = require('emoji-js');

const { arr, merge, ext, toLiteral } = require('./util');
const TmplUtil = require('./TmplUtil');
const SearchDB = require('./SearchDB');
const FileImporter = require('./FileImporter');
const Defaults = require('./defaults.json');

/**
 * This class provides Docolatte specific features.
 * @author amekusa
 */
class Docolatte {
	static new() {
		return new this();
	}
	constructor() {
		this.env;      // environment
		this.tmpl;     // template context
		this.searchDB; // search database
		this.importer; // file importer
		this.emoji;    // emoji convertor
		this.config = Defaults.templates.docolatte;
		this.$ = new TmplUtil();

		// actions to perform at certain points in publish.js
		this.actions = {
			INIT: opts => {
				let { env, config } = opts;
				this.env = env;
				this.configure(config.docolatte);
			},
			INIT_DATA: data => {
				// cull the members of @ignore'd classes out
				data({ ignore: true, kind: 'class' }).each(item => {
					if (!('name' in item)) return;
					data({ memberof: item.name }).remove();
				});
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
						let fileExt = (item.meta && item.meta.filename) ? ext(item.meta.filename) : '';
						for (let ex of item.examples) {
							// find '{@lang <language>}' tag
							let find = /{@lang\s+(\S+?)}\n?/;
							let found = ex.code.match(find);
							if (found) {
								ex.lang = found[1];
								ex.code = ex.code.replace(find, '');
							} else ex.lang = fileExt; // use file extension
						}
					}
				});
				// initialize search database
				let searchDB = new SearchDB({
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
					searchDB.feed(item);
				});
				for (let key in members) {
					searchDB.feed(members[key]);
				}
				this.searchDB = searchDB.serialize();
			},
			TEMPLATES_READY: tmpl => {
				this.tmpl = tmpl; // save template context
				// expand the context
				tmpl.theme = {
					util:   this.$,
					config: this.config,
					filter: this.filter.bind(this),
					files:  this.importer.results,
					scriptConfig: toLiteral({
						searchLimit: this.config.search.limit
					}),
				};
			}
		};

		// filters to apply to contents
		this.filters = {
			TYPE_STRING: r => {
				// if the string is something like `Array.<type>`, shorten it to `type[]`
				let m = r.match(/^array\.<(.+?)>$/i);
				if (!m) return helper.linkto(r, this.$.e(r));
				return helper.linkto(m[1], this.$.e(m[1])) + '[]';
			},
			SOURCE_DOCLET: (r, opts) => {
				// set language of the source
				r.lang = ext(opts.file);
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
				r = r.replace('<!-- %DOCOLATTE::DATA_GOES_HERE% -->', this.$.elems(
					['script', { id: 'docolatte-search-items',   type: 'application/json' }, this.searchDB.serialized.items],
					['script', { id: 'docolatte-search-index',   type: 'application/json' }, this.searchDB.serialized.index],
					['script', { id: 'docolatte-search-options', type: 'application/json' }, this.searchDB.serialized.options]
				));
				return r;
			}
		};

		// functions to override
		this.overrides = {
			updateItemName: item => {
				let r = item.name || '';
				if (item.variable) r = `&hellip;${r}`;
				let attrs = this.$.paramAttrs(item);
				if (attrs.length) attrs.forEach(attr => {
					r += `<i class="signature-attributes" title="${attr.long}">${attr.short}</i>`;
				});
				return r;
			},
		}
	}
	/**
	 * Configures this theme.
	 * @param {object} [config] - Config object to merge into the default
	 * @return {object} Merged config object
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
	 * Performs an action for the provided hook point.
	 * @param {string} on - Hook point
	 * @param {...any} [args] - Arguments to pass to the action
	 */
	action(on, ...args) {
		if (on in this.actions) return this.actions[on](...args);
		console.warn(`[WARN] no action for`, on);
		return undefined;
	}
	/**
	 * Applies a contextual filter on the given content.
	 * @param {string|string[]} context - Context name(s)
	 * @param {any} content - Content to apply the filter on
	 * @param {object} [opts] - Options
	 * @return {any} Modified content
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
	 * Overrides the given function if it is supported. Otherwise, throws an exception.
	 * @param {string} fn - Name of function to override
	 * @param {...any} args - Arguments to pass to the overridden function
	 * @return {any}
	 */
	override(fn, ...args) {
		if (!(fn in this.overrides)) throw `no override for '${fn}'`;
		return this.overrides[fn](...args);
	}
	/**
	 * Convert emojis in the provided string into proper format.
	 * @param {string} str - String
	 * @param {object} conf
	 * @param {object} conf.options - EmojiConverter options
	 * @param {string[]} conf.replace - EmojiConverter function names
	 * @return {string} Modified string
	 * @see https://www.npmjs.com/package/emoji-js
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

module.exports = Docolatte;