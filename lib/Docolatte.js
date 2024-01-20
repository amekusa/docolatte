const helper = require('jsdoc/util/templateHelper');
const EmojiConvertor = require('emoji-js');
const { arr, merge, ext, escRegExp, toLiteral } = require('./Util');
const $ = require('./TmplUtil');
const Nav = require('./Nav');
const SearchDB = require('./SearchDB');
const FileImporter = require('./FileImporter');
const Defaults = require('./defaults.json');


/**
 * This class provides Docolatte specific features.
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
class Docolatte {
	/**
	 * @param {object} [opts]
	 * @param {Hooks} opts.actions - Action registry
	 * @param {Hooks} opts.filters - Filter registry
	 * @param {Hooks} opts.overrides - Override registry
	 */
	constructor(opts = {}) {
		this.env;      // environment
		this.data;     // master data
		this.tmpl;     // template context
		this.searchDB; // search database
		this.importer; // file importer
		this.emoji;    // emoji convertor
		this.config = Defaults.templates.docolatte;

		// hook registries
		let { actions, filters, overrides } = opts;

		// actions to perform at certain points in publish.js
		if (actions) actions.add({
			INIT: ({ env, config }) => {
				this.env = env;
				this.configure(config.docolatte);
			},
			INIT_DATA: ({ data }) => {
				this.data = data;
				// exclude
				if (this.config.data.exclude.length) {
					let excludes = [];
					for (let i = 0; i < this.config.data.exclude.length; i++) {
						let exclude = this.config.data.exclude[i];
						let m = exclude.match(/^\/(.+)\/([a-z]*)$/);
						data({ longname: (m ? { regex: new RegExp(m[1], m[2]) } : exclude) }).each(item => {
							if (!excludes.includes(item.___id)) excludes.push(item.___id);
						});
					}
					excludes = data({ ___id: excludes });
					let found = excludes.get();
					if (found.length) {
						console.log('---- Excluded Entries ----');
						console.table(found, ['___id', 'kind', 'longname', 'memberof']);
						excludes.remove();
					}
				}
				// cull orphaned members
				if (this.config.data.removeOrphans) {
					let orphans = [];
					let deadParents = [];
					data({ memberof: { isString: true } }).each(member => {
						// member that has no parent = orphan
						if (deadParents.includes(member.memberof)) {
							orphans.push(member.___id);
						} else if (!data({
							longname: member.memberof,
							kind: { isString: true }
						}).get().length) {
							deadParents.push(member.memberof);
							orphans.push(member.___id);
						}
					});
					orphans = data({ ___id: orphans });
					let found = orphans.get();
					if (found.length) {
						console.log('---- Orphaned Members ----');
						console.table(found, ['___id', 'kind', 'longname', 'memberof']);
						orphans.remove();
					}
				}
			},
			OUTDIR_READY: ({ outdir }) => {
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
				// create '.nojekyll' file
				if (this.config.tweak.nojekyll) {
					this.importer.add({ resolve: 'create', as: '.nojekyll', dst: '.', src: '' });
				}
				// user specified files
				if (this.config.import) this.importer.add(this.config.import);
				if (this.config.imports) this.importer.add(this.config.imports); // @deprecated
				// import all
				this.importer.import();
			},
			DATA_READY: ({ data, members }) => {
				let prefix = arr(this.config.code.examples.captionPrefix).map(escRegExp).join('|');

				data().each(item => {
					// parse multiline @license
					if (item.license) {
						let m = item.license.match(/^\s*(\S.*?)[\r\n]+?([\s\S]+)/);
						if (m) {
							item.license = m[1];
							item.licenseMore = $.br($.link($.e(m[2])));
						}
					}
					// modify code examples
					if (item.examples) {
						let fileExt = (item.meta && item.meta.filename) ? ext(item.meta.filename) : '';
						for (let ex of item.examples) {
							// set `.lang` property
							// find '{@lang <language>}' tag
							let find = /^\s*{@lang\s+(\S+?)}[\r\n]+/;
							let found = ex.code.match(find);
							if (found) {
								ex.lang = found[1];
								ex.code = ex.code.replace(find, '');
							} else ex.lang = fileExt; // use file extension

							// detect caption prefix
							if (prefix) {
								find = new RegExp(`^\s*(?:${prefix})(.+?)[\r\n]+`);
								found = ex.code.match(find);
								if (found) {
									ex.caption = found[1];
									ex.code = ex.code.replace(find, '');
								}
							}
						}
					}
				});
			},
			TEMPLATES_READY: ({ ctx }) => {
				this.tmpl = ctx; // save template context
				// expand the context
				this.tmpl.theme = {
					util:   $,
					config: this.config,
					files:  this.importer.results,
					filter: (context, content) => (
						filters ? filters.apply(context, content) : content
					),
					bodyClass: $.classes({
						'config': true,
						'no-footer': this.config.footer.hide,
						'sidebar-h-scroll': this.config.toc.allowHorizontalScroll,
					}),
					scriptConfig: toLiteral({
						searchLimit: this.config.search.limit,
						syncHash: this.config.tweak.syncHash,
					}),
				};
			}
		});

		// filters to apply to various contents
		if (filters) filters.add({
			TYPE_STRING: r => {
				// if the string is something like `Array.<type>`, shorten it to `type[]`
				let m = r.match(/^array\.<(.+?)>$/i);
				if (!m) return helper.linkto(r, $.e(r));
				return helper.linkto(m[1], $.e(m[1])) + '[]';
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
				// insert serialized searchDB JSONs into HTML
				r = r.replace('<!-- %DOCOLATTE::DATA_GOES_HERE% -->', $.elems(
					['script', { id: 'docolatte-search-items',   type: 'application/json' }, this.searchDB.serialized.items],
					['script', { id: 'docolatte-search-index',   type: 'application/json' }, this.searchDB.serialized.index],
					['script', { id: 'docolatte-search-options', type: 'application/json' }, this.searchDB.serialized.options]
				));
				return r;
			}
		});

		// functions @ publish.js to override
		if (overrides) overrides.add({
			updateItemName: item => {
				let r = item.name || '';
				if (item.variable) r = `&hellip;${r}`;
				let attrs = $.paramAttrs(item);
				if (attrs.length) attrs.forEach(attr => {
					r += `<i class="signature-attributes" title="${attr.long}">${attr.short}</i>`;
				});
				return r;
			},
			buildNav: members => {
				return this.buildNav(members);
			}
		});
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
	 * Builds navigation menus.
	 * @param {object} members
	 * @return {string} HTML
	 */
	buildNav(members) {
		let r = '';

		// refs to menu items
		let refs = [];

		// build nav menus
		for (let k in this.config.toc.menus) {
			let nav = {
				refs,
				data: members[k],
				heading: this.config.toc.menus[k],
				wrap: [`<nav class="menu">`, `</nav>`],
				wbr: !this.config.toc.allowHorizontalScroll
			};
			if (k == 'tutorials') {
				nav.getLink = doclet => ({ url: helper.tutorialToUrl(doclet.name) });

			} else if (k == 'globals') {
				// add 'See All' link
				nav.getItems = data => {
					if (data && data.length) data.push({ longname: 'global' });
					return data;
				};
				nav.getLink = doclet => {
					if (doclet.longname == 'global') return {
						label: this.config.toc.menus[k],
						text:  'See All'
					};
				};

			} else {
				if (k == 'namespaces') nav.getLink = doclet => ({ label: doclet.longname.replace(/^module:/, '') });
				let getLink = doclet => ({
					label: doclet.longname,
					text:  doclet.name
				});
				nav.children = [{
					class: 'variables' + (this.config.toc.icons.variables.hide ? '' : ' has-icons'),
					getItems: parent => this.data({ kind: 'member', memberof: parent.longname }).get(),
					getLink,
				}, {
					class: 'functions' + (this.config.toc.icons.functions.hide ? '' : ' has-icons'),
					getItems: parent => this.data({ kind: 'function', memberof: parent.longname }).get(),
					getLink,
				}];
			}
			nav.heading = `<h3>` + nav.heading + `</h3>`;
			nav = new Nav(nav);
			r += nav.build();
		}

		// setup search DB
		this.searchDB = new SearchDB({
			pk: '___id',
			search: {
				keys: this.config.search.keys
			}
		});
		// feed refs to DB
		for (let i = 0; i < refs.length; i++) {
			this.searchDB.feed(refs[i].doclet, {
				url:   refs[i].url,
				label: refs[i].label
			});
		}
		// serialize for later use
		this.searchDB.serialize();

		return r;
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