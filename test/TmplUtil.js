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
		]
	], 'deepEqual');

});