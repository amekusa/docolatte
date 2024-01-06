const assert = require('assert');
const { testMethod } = require('@amekusa/nodeutil').test;

const main = 'lib/Util';
describe(main, () => {
	const $ = require('../' + main);

	testMethod($, 'splitWords', [
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
			['WelcomeToWWWeb'],
			['Welcome', 'To', 'WWWeb']
		],
		[
			['verylongstring', { maxLength: 8 }],
			['verylong', 'string']
		]
	], 'deepEqual');

	testMethod($, 'escRegExp', [
		[
			['^re.ge.xp$'],
			'\\^re\\.ge\\.xp\\$'
		]
	], 'equal');
});