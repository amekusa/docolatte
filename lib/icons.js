/**
 * Custom SVG icons.
 * `{ATTRS}` should be replaced with proper attributes, or an empty string.
 * @author Satoshi Soma (amekusa.com)
 * @license Apache-2.0
 * Copyright 2020 Satoshi Soma
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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