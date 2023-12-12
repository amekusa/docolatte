const helper = require('jsdoc/util/templateHelper');

/**
 */
class Nav {
	constructor(data, heading, opts = {}) {
		this.data = data;
		this.heading = heading;
		this.db = opts.db;
		this.refs = opts.refs;
		this.getLink = opts.getLink;
		this.html;
	}
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
	getRef(doclet) {
		for (let i = 0; i < this.refs.length; i++) {
			let ref = this.refs[i];
			if (ref.doclet === doclet) return ref;
			if (ref.doclet.___id && ref.doclet.___id == doclet.___id) return ref;
		}
		return;
	}
	build() {
		if (this.html) return this.html;
		let refToLink = (ref) => `<a href="${ref.url}">${ref.label}</a>`;
		let buildMembers = (doclet, kind, className) => {
			let r = '';
			let members = helper.find(this.db, { kind, memberof: doclet.longname });
			if (members.length) {
				members.forEach(member => {
					if (this.getRef(member)) return;
					let ref = this.newRef(member, {
						label: member.name
					});
					r += `<li>` + refToLink(ref) + `</li>`
				});
			}
			return r ? `<ul class="${className}">${r}</ul>` : r;
		};
		let r = '';
		this.data.forEach(doclet => {
			if (this.getRef(doclet)) return; // skip
			let ref = this.newRef(doclet);
			r += `<li>`;
			r += refToLink(ref);
			if (this.db && doclet.___id && doclet.longname) {
				r += buildMembers(doclet, 'member', 'members');
				r += buildMembers(doclet, 'function', 'methods');
			}
			r += `</li>`;
		});
		r = this.html = r ? `<nav><h3>${this.heading}</h3><ul>${r}</ul></nav>` : r;
		return r;
	}
}

module.exports = Nav;