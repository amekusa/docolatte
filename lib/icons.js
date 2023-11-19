/**
 * Custom SVG icons.
 * `{ATTRS}` should be replaced with proper attributes, or an empty string.
 * @author amekusa
 */
module.exports = {
	'halfmoon': `
<svg {ATTRS} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<clipPath id="fill">
		<rect x="0" y="0" width="12" height="24"/>
	</clipPath>
	<circle id="shape" cx="12" cy="12" r="10"></circle>
	<use clip-path="url(#fill)" href="#shape" fill="currentColor"/>
</svg>`
};