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

	testMethod($, 'base', [
		[
			[0, '01'], '0'
		],
		[
			[1, '01'], '1'
		],
		[
			[2, '01'], '10'
		],
		[
			[3, '01'], '11'
		],
		[
			[4, '01'], '100'
		],
		[
			[-4, '01'], '-100'
		],
		[
			[0, 'abc'], 'a'
		],
		[
			[1, 'abc'], 'b'
		],
		[
			[2, 'abc'], 'c'
		],
		[
			[3, 'abc'], 'ba'
		],
		[
			[4, 'abc'], 'bb'
		],
		[
			[15, '0123456789abcdef'], 'f'
		],
		[
			[16, '0123456789abcdef'], '10'
		],
		[
			[255, '0123456789abcdef'], 'ff'
		],
		[
			[123456789, '0123456789abcdef'], Number(123456789).toString(16)
		],
		[
			[987654321, '0123456789abcdef'], Number(987654321).toString(16)
		]
	], 'strictEqual');

});