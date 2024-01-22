module.exports = [
	{
		ignores: [
			'node_modules/',
			'static/',
			'docs/'
		]
	},
	{
		files: [
			'lib/**/*.js',
			'src/**/*.js'
		],
		rules: {
			semi: ['error', 'always'],
			indent: ['warn', 'tab', {
				ignoredNodes: ['SwitchCase']
			}]
		}
	}
];
