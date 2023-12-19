const helper = require('jsdoc/util/templateHelper');
const $ = require('./TmplUtil');

/**
 * Navigation builder.
 * @author amekusa
 */
class Nav {
	/**
	 * @param {object} opts
	 * @param {Doclet[]} opts.data
	 * @param {string} opts.heading
	 * @param {string[]} opts.wrap
	 * @param {string} opts.class
	 * @param {Ref[]} opts.refs
	 * @param {function} opts.getLink
	 * @param {function} opts.getItems
	 * @param {Nav[]|object[]} opts.children
	 */
	constructor(opts = {}) {
		this.data     = opts.data || null;
		this.heading  = opts.heading || '';
		this.wrap     = opts.wrap || ['', ''];
		this.class    = opts.class || '';
		this.refs     = opts.refs;
		this.getLink  = opts.getLink;
		this.getItems = opts.getItems;

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
		if (!link) link = this.getLink ? this.getLink(doclet) : {};
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
		this.children.push(child);
	}
	/**
	 * Builds all the refs and HTML.
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
			if (this.getRef(doclet)) return; // skip
			let ref = this.newRef(doclet);
			r += `<li>` + ref.link;
			// submenus
			this.children.forEach(child => {
				r += child.build(doclet);
			});
			r += `</li>`;
		});
		let attrs = this.class ? ` class="${this.class}"` : '';
		r = this.html = r ? (this.wrap[0] + this.heading + `<ul${attrs}>${r}</ul>` + this.wrap[1]) : r;
		return r;
	}
}

/**
 * Reference to an individual nav item.
 */
class Ref {
	/**
	 * @param {Doclet} doclet
	 * @param {object} link
	 * @param {string} link.url - Link URL
	 * @param {string} link.label - Link label
	 * @param {string} link.text - Link text (Defaults to `link.label`)
	 */
	constructor(doclet, link) {
		this.doclet = doclet;
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