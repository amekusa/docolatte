const feather = require('feather-icons');
const { splitWords } = require('./Util');
const icons = require('./icons');

/**
 * Template utility.
 * @hideconstructor
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
class TmplUtil {
	/**
	 * Outputs an HTML tag with the given name and attributes.
	 * @param {string} name - Tag name
	 * @param {object|string} [attrs] - Attributes
	 * @return {string} HTML
	 * @example
	 * const $ = require('TmplUtil');
	 * $.tag('link', {
	 *   type: 'text/css',
	 *   rel:  'stylesheet',
	 *   href: 'style.css'
	 * });
	 */
	tag(name, attrs = null) {
		return `<${name + $.attrs(attrs)}>`;
	}
	/**
	 * Composes HTML an element with the given arguments.
	 * @param {string} name - Tag name
	 * @param {object|string} [attrs] - Attributes. Requires the number of args to be 3
	 * @param {string} [content] - Content of the element
	 * @return {string} HTML
	 * @example // Composing a simple anchor element
	 * const $ = require('TmplUtil');
	 * let html = $.elem(
	 *   'a', {
	 *     href:  'https://example.com',
	 *     title: 'Example Site'
	 *   },
	 *   'See example'
	 * );
	 */
	elem(name, ...args) {
		let r = `<${name}`;
		switch (args.length) {
		 case 0:  // no content, no attributes
			r += '>'; break;
		 case 1:  // has content, no attributes
			r += '>' + args[0]; break;
		 default: // has content, has attributes
			r += $.attrs(args[0]) + '>' + args[1]; break;
		}
		return r + `</${name}>`;
	}
	/**
	 * Composes multiple HTML elements with the given array of arguments.
	 * @param {...array} args - Array(s) of arguments for {@link TmplUtil#elem}
	 * @return {string} HTML
	 * @example
	 * const $ = require('TmplUtil');
	 * let html = $.elems(
	 *   ['script', { id: 'data1', type: 'application/json' }, data1],
	 *   ['script', { id: 'data2', type: 'application/json' }, data2],
	 *   ['script', { id: 'data3', type: 'application/json' }, data3],
	 * );
	 */
	elems(...args) {
		let r = '';
		for (let i = 0; i < args.length; i++) r += $.elem(...args[i]);
		return r;
	}
	/**
	 * Composes HTML attributes from the given object.
	 * @param {object|string} data - Object with keys as attribute names, or just a string
	 * @param {string} [sep=(whitespace)] - Separator for array values
	 * @return {string} HTML attributes
	 */
	attrs(data, sep = ' ') {
		if (!data) return '';
		if (typeof data == 'string') return ' ' + data;
		let r = '';
		let humps = /([a-z])([A-Z])/g;
		for (let key in data) {
			let value = data[key];
			// convert camelCased key to hyphenated
			key = key.replaceAll(humps, '$1-$2').toLowerCase();
			switch (typeof value) {
			case 'boolean':
				if (value) r += ` ${key}`;
				break;
			case 'undefined':
				break;
			case 'object':
				value = Array.isArray(value) ? value.join(sep) : value;
				/* no-break */
			default:
				if (value) r += ` ${key}="${value}"`;
			}
		}
		return r;
	}
	/**
	 * Outputs class attribute with the given object's keys.
	 * @param {object} obj
	 * @return {string} `class` attribute
	 */
	classes(obj) {
		let c = [];
		for (let k in obj) {
			if (obj[k]) c.push(k);
		}
		return c.length ? ` class="${c.join(' ')}"` : '';
	}
	/**
	 * Escapes non-safe characters in the given string.
	 * @param {string} str
	 * @return {string} Modified string
	 */
	e(str) {
		if (!str) return '';
		let map = {
			'&': 'amp',
			'"': 'quot',
			"'": 'apos',
			'<': 'lt',
			'>': 'gt'
		};
		let ents = Object.values(map).join('|'); // to avoid double-escape '&'s
		let find = new RegExp(`["'<>]|(&(?!${ents};))`, 'g'); // regex negative match = (?!word)
		return `${str}`.replace(find, found => `&${map[found]};`);
	}
	/**
	 * Ternary-like.
	 * @param {any} cond Condition
	 * @param {string} then String to return if `cond` is truthy
	 * @param {string} [replace] Substring in `then` to replace with `cond`
	 * @param {string} [or] String to return if `cond` is falsey
	 * @return {string}
	 * @example
	 * const $ = require('TmplUtil');
	 * let name  = 'Joji';
	 * let greet = $.if(name, 'Hello, {*}.'); // "Hello, Joji."
	 */
	if(cond, then, replace = '{*}', or = '') {
		return cond ? then.replace(replace, cond) : or;
	}
	/**
	 * Formats an array to a `<ul>` list.
	 * If the array has only 1 item, omits `<ul>` and `<li>` tags
	 * @param {string[]} items - Array of strings
	 * @return {string} HTML
	 */
	list(items, forEach = null) {
		if (!items || !items.length) return '';
		if (!forEach) forEach = item => item;
		if (items.length == 1) return forEach(items[0]);
		let r = '';
		items.forEach(item => {
			r += '<li>' + forEach(item) + '</li>';
		});
		return `<ul>${r}</ul>`;
	}
	/**
	 * Formats an array to a multiline string.
	 * @param {string|string[]} strs - Array of strings
	 * @param {string} linebreak=\n - Linebreak to insert
	 * @return {string}
	 */
	lines(strs, linebreak = '\n') {
		return Array.isArray(strs) ? strs.join(linebreak) : strs;
	}
	/**
	 * Iterates over the given array or object.
	 * @param {any[]|object} over - Array or object to iterate over
	 * @param {function} fn - Callback for each iteration
	 * @param {string} [or] - Fallback if `over` was empty
	 * @return {string} A string consists of all the return values of `fn` concatenated
	 */
	iterate(over, fn, or = '') {
		let r = or;
		if (over) {
			if (Array.isArray(over) && over.length) {
				r = '';
				for (let i = 0; i < over.length; i++) {
					let fR = fn(over[i], i, over.length - 1);
					if (fR) r += fR;
				}
			} else {
				let keys = Object.keys(over);
				if (keys && keys.length) {
					r = '';
					for (let i = 0; i < keys.length; i++) {
						let key = keys[i];
						let fR = fn(over[key], key);
						if (fR) r += fR;
					}
				}
			}
		}
		return r;
	}
	/**
	 * Replaces linebreak chars with `<br>` in the given string.
	 * @param {string} str
	 * @return {string} Modified string
	 */
	br(str) {
		return str.replaceAll(/[\r\n]/g, '<br>');
	}
	/**
	 * Inserts `<wbr>` tags between words, numbers, and symbols in the given string.
	 * @param {string} str
	 * @return {string} Modified string
	 */
	wbr(str) {
		return splitWords(str).join('<wbr>');
	}
	/**
	 * Converts URLs begin with `http(s)://` in the given string to `<a>` elements.
	 * @param {string} str
	 * @return {string} Modified string
	 */
	link(str) {
		return str.replaceAll(/(^|[^\w])(https?:\/\/\S+)/g, '$1<a href="$2">$2</a>');
	}
	/**
	 * Returns `<svg>` string of an icon.
	 * @param {string} name - Icon name
	 * @param {object} [attrs] - HTML attributes to add to resulting `<svg>`
	 * @return {string} HTML
	 * @see https://github.com/feathericons/feather
	 */
	icon(name, attrs = { class: 'icon' }) {
		let r = '';
		if (name in icons) r = icons[name].replace('{ATTRS}', $.attrs(attrs));
		else if (feather.icons[name]) r = feather.icons[name].toSvg(attrs);
		else throw `no such icon as '${name}'`;
		return r;
	}
	/**
	 * Returns all attributes of the given param object.
	 * @param {object} param - Param object
	 * @return {object[]} Attributes
	 */
	paramAttrs(param) {
		let r = [];
		if (param.optional) r.push({ long: 'optional', short: 'opt' });
		if (param.nullable) r.push({ long: 'nullable', short: 'null' });
		if (param.variable) r.push({ long: 'repeatable', short: 'rpt' });
		return r;
	}
}

const $ = new TmplUtil();
module.exports = $;