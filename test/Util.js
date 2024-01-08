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
	], 'strictEqual');

	testMethod($, 'toLiteral', [
		[
			[123], '123'
		],
		[
			[true], 'true'
		],
		[
			[false], 'false'
		],
		[
			['abc'], '"abc"'
		],
		[
			['abc', { quote: "'" }],
			"'abc'"
		],
		[
			['string with "QUOTES"'],
			'"string with \\"QUOTES\\""'
		],
		[
			[[123, true, false, 'abc']],
			'[123,true,false,"abc"]'
		],
		[
			[{ num: 123, bool: true, str: 'abc' }],
			'{"num":123,"bool":true,"str":"abc"}'
		],
		[
			[{ num: 123, bool: true, str: 'abc' }, { quoteKeys: false }],
			'{num:123,bool:true,str:"abc"}'
		]
	], 'strictEqual');

});