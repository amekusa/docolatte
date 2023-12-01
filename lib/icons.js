/**
 * Custom SVG icons.
 * `{ATTRS}` should be replaced with proper attributes, or an empty string.
 * @author amekusa
 */
module.exports = {

	'halfmoon': `
<svg {ATTRS} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
	<path d="M 12 3 A 9 9 0 0 0 12 21 Z" stroke="none" fill="currentColor"/>
	<circle cx="12" cy="12" r="9"/>
</svg>`,
	/**
	 * NOTE: About SVG <path>:
	 * 'M x y' = Move to x y
	 * 'A rx ry 0 0 0 x y' = Draw arc to x y with radius rx ry
	 * 'Z' = Close the path
	 **/

};