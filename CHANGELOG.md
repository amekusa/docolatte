# Changelog

## [4.4.0]

### Added
- New config option:
  - `tweak.syncHash`


---

## [4.3.0]

### Added
- Now it's fully compatible with JSDoc 4

### Changes
- Removed some unnecessary dependencies
- Removed `_src` directory from output


---

## [4.2.0]

### Added
- New config option:
 - `toc.allowHorizontalScroll`


---

## [4.1.0]

### Added
- New config option:
  - `tweak.nojekyll`


---

## [4.0.0]

### Added
- "LightSwitch" feature
  - This provides light/dark theme-switching mechanics
- URL hash is synced with the current heading as the page scrolls
- New config options:
  - `toc.menus`
  - `toc.icons`
  - `code.examples.captionPrefix`
  - `search.keys`
  - `search.limit`
  - `search.hint.body`
  - `data.exclude`
  - `data.removeOrphans`
  - `lightSwitch.*`

### Changes
- Breaking changes:
  - Deprecated `imports` config option. Use `import` key (without `s`) instead
  - Changed the HTML structure and classes in some parts
- Design changes:
  - Added icons to variables & functions in TOC items
  - Changed the style of highlighted items in TOC
  - Changed the style of headings in TOC
  - Added "Scroll to Top" button
  - A few minor adjustments for better legibility

### Fixed
- Eliminated the possibilities of broken links shown in search results.
- Now SVG icons are properly shown without any warning for a local site (browsed with `file://` protocol).


---

## [3.5.1]

### Fixed
- Removed jsdoc from dependencies in package.json. This at least suppresses NPM's warning for TaffyDB, which is a false-positive to begin with.
  - https://github.com/amekusa/docolatte/issues/3
- Use a dummy favicon if it is not provided by user, in order to avoid 404 error in browser.

---

## [3.5.0]

### Added
- Support importing custom assets with `imports` option

### Fixed
- The wrong operator in `TmplUtil::list()`
  - https://github.com/amekusa/docolatte/issues/2

---

## [3.4.0]

### Changes
- `readme.*` options now also apply to tutorial pages

### Added
- Support emoji conversion in README and tutorial pages
  - New option: `readme.emoji.replace`, `readme.emoji.options`
- Support `{@lang ...}` tags for `@example`

### Fixes
- Fixed the issue that you couldn't search in tutorial pages

---

## [3.3.0]

### Changes
- Move tutorials menu in sidebar to the top
- Remove height limitation of tables

### Added
- New option: `home.package.hide`
- New option: `footer.license`

### Improvements
- Improved HTML & CSS to be more legible and consistent over all

---

## [3.2.0]

### Added
- New option: `readme.truncate`

---

## [3.0.0]

### Changes
- Migrated the code highlighter from Google Code Prettify to **[highlight.js](https://highlightjs.org/)**.
  You may need to change the `code.theme` option value to adapt for this migration

### Added
- New option: `minify`

### Improvements
- Improved sidebar's scroll behavior

### Fixes
- Fixed the bugs caused by Simplebar

---

## [2.11.0]

### Changes
- Made the scrollbar in the sidebar looks nicer with [Simplebar](https://github.com/Grsmto/simplebar)

### Fixes
- Fixed build errors
