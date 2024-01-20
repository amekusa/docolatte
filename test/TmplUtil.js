const assert = require('assert');
const { testMethod } = require('@amekusa/nodeutil').test;

const main = 'lib/TmplUtil';
describe(main, () => {
	const $ = require('../' + main);

	testMethod($, 'attrs', [
		[
			[{ alfa: 1, bravo: 2, charlie: 3 }],
			' alfa="1" bravo="2" charlie="3"'
		],
		[
			[{
				str: 'foo',
				strEmpty: '',
				bool: true,
				boolFalse: false,
				arr: ['alfa', 'bravo'],
				arrEmpty: [],
			}],
			' str="foo" bool arr="alfa bravo"'
		],
		[
			[{ camelCasedAttribute: 'camelCasedAttributeValue' }],
			' camel-cased-attribute="camelCasedAttributeValue"'
		],
	], 'deepEqual');

	testMethod($, 'link', [
		[
			['http://example.com'],
			'<a href="http://example.com">http://example.com</a>'
		],
		[
			['https://secure.example.com'],
			'<a href="https://secure.example.com">https://secure.example.com</a>'
		],
		[
			['Click Here: http://example.com'],
			'Click Here: <a href="http://example.com">http://example.com</a>'
		],
		[
			['git+http://example.com'],
			'git+<a href="http://example.com">http://example.com</a>'
		],
		[ // failed link
			['XXXhttp://example.com'],
			'XXXhttp://example.com'
		],
		[ // multiple links
			['Click Here: http://example.com and\nHere: https://secure.example.com Thank you'],
			'Click Here: <a href="http://example.com">http://example.com</a> and\nHere: <a href="https://secure.example.com">https://secure.example.com</a> Thank you'
		]
	]);

});