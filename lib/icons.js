/**
 * Custom SVG icons.
 * `{ATTRS}` should be replaced with proper attributes, or an empty string.
 * @author amekusa
 */
module.exports = {

	'halfmoon': `
<svg {ATTRS} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<defs>
		<clipPath id="left-half">
			<rect x="0" y="0" width="12" height="24"/>
		</clipPath>
	</defs>
	<circle id="outline" cx="12" cy="12" r="9"/>
	<use href="#outline" clip-path="url(#left-half)" fill="currentColor"/>
</svg>`,

};