const assert = require('assert');

describe('lib/Util.js', () => {
	const $ = require('../lib/Util');

	it('splitWords', () => {
		for (item of [
			[
				['helloWorld'],
				['hello', 'World']
			],
			[
				['HelloMyWorld'],
				['Hello', 'My', 'World']
			],
			[
				['hello.my.world'],
				['hello', '.my', '.world']
			],
			[
				['verylongstring', { maxLength: 8 }],
				['verylong', 'string']
			]
		]) {
			assert.deepEqual(
				$.splitWords(...item[0]),
				item[1]
			);
		}
	});
});