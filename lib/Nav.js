const helper = require('jsdoc/util/templateHelper');

/**
 * Reference to an item in {@link Nav}.
 * @typedef {object} Ref
 * @prop {Doclet} doclet
 * @prop {string} url
 * @prop {string} label
 **/

/**
 * Navigation builder.
 * @author amekusa
 */
class Nav {
	/**
	 * @param {object[]} data
	 * @param {string} heading
	 * @param {object} [opts]
	 * @param {TAFFY} opts.db
	 * @param {object[]} opts.refs
	 * @param {function} opts.getLink
	 */
	constructor(data, heading, opts = {}) {
		this.data = data;
		this.heading = heading;
		this.db = opts.db;
		this.refs = opts.refs;
		this.getLink = opts.getLink;
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
		let ref = {
			doclet,
			url:   link.url || helper.createLink(doclet),
			label: link.label || doclet.name || doclet.longname || ''
		};
		this.refs.push(ref);
		return ref;
	}
	/**
	 * Returns a ref with the given doclet if it exists.
	 * @param {Doclet} doclet
	 * @return {object} Ref
	 */
	getRef(doclet) {
		for (let i = 0; i < this.refs.length; i++) {
			let ref = this.refs[i];
			if (ref.doclet === doclet) return ref;
			if (ref.doclet.___id && ref.doclet.___id == doclet.___id) return ref;
		}
		return;
	}
	/**
	 * Builds all the refs and HTML.
	 * @return {string} HTML
	 */
	build() {
		if (this.html) return this.html;
		let r = '';
		this.data.forEach(doclet => {
			if (this.getRef(doclet)) return; // skip
			let ref = this.newRef(doclet);
			r += `<li>`;
			r += _link(ref.url, ref.label);
			if (this.db && doclet.___id && doclet.longname) {
				r += this._buildMembers(doclet, 'member', 'members');
				r += this._buildMembers(doclet, 'function', 'methods');
			}
			r += `</li>`;
		});
		r = this.html = r ? `<nav><h3>${this.heading}</h3><ul>${r}</ul></nav>` : r;
		return r;
	}
	/**
	 * @private
	 */
	_buildMembers(doclet, kind, className) {
		let r = '';
		this.db({ kind, memberof: doclet.longname }).each(member => {
			if (this.getRef(member)) return;
			let ref = this.newRef(member, {
				label: member.longname
			});
			r += `<li>` + _link(ref.url, member.name) + `</li>`
		});
		return r ? `<ul class="${className}">${r}</ul>` : r;
	}
}

function _link(url, label) {
	return `<a href="${url}">${label}</a>`;
}

module.exports = Nav;