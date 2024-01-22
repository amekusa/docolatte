const helper = require('jsdoc/util/templateHelper');
const $ = require('./TmplUtil');

/**
 * Navigation builder.
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
class Nav {
	/**
	 * @param {object} [opts]
	 * @param {Doclet[]} opts.data
	 * @param {string} opts.heading
	 * @param {string[]} opts.wrap
	 * - `0`: Opening tag
	 * - `1`: Ending tag
	 * @param {string} opts.class
	 * @param {boolean} opts.wbr
	 * @param {Ref[]} opts.refs
	 * @param {function} opts.getLink - Callback to get link for each menu item.
	 * - Params: `doclet`
	 * - Return: `{ url, label, text }`
	 * @param {function} opts.getItems - Callback to retrieve menu items.
	 * - Params: `data`
	 * - Return: `<object[]>`
	 * @param {function} opts.filter - Filter to apply to HTML result.
	 * - Params: `html, nav, data`
	 * - Return: Modified HTML
	 * @param {Nav[]|object[]} opts.children
	 */
	constructor(opts = {}) {
		this.data     = opts.data || null;
		this.heading  = opts.heading || '';
		this.wrap     = opts.wrap || ['', ''];
		this.class    = opts.class || '';
		this.wbr      = opts.wbr;
		this.refs     = opts.refs;
		this.getLink  = opts.getLink;
		this.getItems = opts.getItems;
		this.filter   = opts.filter;

		this.children = [];
		if (opts.children) opts.children.forEach(child => { this.addChild(child); });

		this.html;
	}
	/**
	 * Registers new ref with the given doclet.
	 * @param {Doclet} doclet
	 * @param {object} [link]
	 * @param {string} link.url
	 * @param {string} link.label
	 * @return {Ref} New ref
	 */
	newRef(doclet, link = null) {
		if (!this.refs) this.refs = [];
		if (!link && this.getLink) link = this.getLink(doclet);
		let ref = new Ref(doclet, link);
		this.refs.push(ref);
		return ref;
	}
	/**
	 * Returns a ref with the given doclet if it exists.
	 * @param {Doclet} doclet
	 * @return {Ref} Ref
	 */
	getRef(doclet) {
		for (let i = 0; i < this.refs.length; i++) {
			let ref = this.refs[i];
			if (ref.has(doclet)) return ref;
		}
		return;
	}
	/**
	 * Adds the given Nav as a child.
	 * @param {Nav|object} nav
	 */
	addChild(nav) {
		let child = nav instanceof Nav ? nav : new Nav(nav);
		if (!child.refs) child.refs = this.refs; // share refs
		if (typeof child.wbr == 'undefined') child.wbr = this.wbr; // inherit wbr flag
		this.children.push(child);
	}
	/**
	 * Builds all the refs and HTML.
	 * @param {object[]} [data]
	 * @return {string} HTML
	 */
	build(data = null) {
		if (!data) {
			if (this.html) return this.html;
			data = this.data || [];
		}
		if (this.getItems) data = this.getItems(data);
		let r = '';
		data.forEach(doclet => {
			if (this.getRef(doclet)) return; // avoid duplication
			let ref = this.newRef(doclet);
			let sub = '';
			this.children.forEach(child => {
				sub += child.build(doclet);
			});
			r += `<li${sub ? ' class="has-child"' : ''}>`;
			r +=   `<a href="${ref.url}">${this.wbr ? $.wbr(ref.text) : ref.text}</a>` + sub;
			r += `</li>`;
		});
		if (r) {
			let attrs = { class: [] };
			if (this.class) attrs.class.push(this.class);
			if (this.wbr)   attrs.class.push('wbr');
			r = this.wrap[0] + this.heading + `<ul${$.attrs(attrs)}>${r}</ul>` + this.wrap[1];
		}
		if (this.filter) r = this.filter(r, this, data);
		this.html = r;
		return r;
	}
}

/**
 * Reference to an individual nav item.
 */
class Ref {
	/**
	 * @param {Doclet} doclet
	 * @param {object} [link]
	 * @param {string} link.url - Link URL
	 * @param {string} link.label - Link label
	 * @param {string} link.text - Link text (Defaults to `link.label`)
	 */
	constructor(doclet, link = null) {
		this.doclet = doclet;
		if (!link) link = {};
		this.url   = link.url || helper.createLink(doclet);
		this.label = link.label || doclet.name || doclet.longname || '';
		this.text  = link.text || this.label;
	}
	/**
	 * `<a>` linking to this ref.
	 * @type string
	 * @readonly
	 */
	get link() {
		return `<a href="${this.url}">${this.text}</a>`;
	}
	/**
	 * Whether this ref is associated with the given doclet.
	 * @param {Doclet} doclet
	 * @return {boolean}
	 */
	has(doclet) {
		if (this.doclet === doclet) return true;
		if (this.doclet.___id && this.doclet.___id == doclet.___id) return true;
		return false;
	}
}

module.exports = Nav;