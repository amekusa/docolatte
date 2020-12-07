# docolatte [![npm package](https://img.shields.io/badge/dynamic/json?label=npm%0Apackage&query=%24%5B%27dist-tags%27%5D%5B%27latest%27%5D&url=https%3A%2F%2Fregistry.npmjs.org%2Fdocolatte%2F)](https://www.npmjs.com/package/docolatte)

:chocolate_bar: Bittersweet theme for JSDoc 3

![screenshot class](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/class.png)  
![screenshot methods](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/methods.png)  
![screenshot source](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/source.png)  
![screenshot mobile](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/mobile.png)![screenshot mobile menu](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/mobile-menu.png)

(The sample codes in the screenshots are derived from [docdash/fixtures](https://github.com/clenemt/docdash/tree/master/fixtures))

[All screenshots](https://github.com/amekusa/docolatte/tree/trunk/gallery)

## Features

- Responsive
- Focused on legibility
- Colorful, but not distracting
- Customizable options for branding your project

### Keyboard-only Search & Navigation
![screenshot search demo](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/search-demo.gif)

### Interactive TOC (Table of Contents)
![screenshot navigation demo](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/nav-demo.gif)


## Install

```sh
$ npm i --save-dev docolatte
```


## Usage

Specify the path to docolatte ( normally: `node_modules/docolatte` ) as the JSDoc template with `-t` option of `jsdoc` command:

```sh
$ jsdoc entry-file.js -t node_modules/docolatte
```

Or set the path to `opts.template` in your JSDoc configuration file:

```json
{
  "opts": {
    "template": "node_modules/docolatte",
  }
}
```

## Customize

Docolatte supports some configuration options to customize the HTML output.

```json
{
  "templates": {
    "docolatte": {
      "branding": {
        "title": "My Project",
        "link":  "https://example.com/project/",
        "icon":  "home",
        "font": {
          "size":   "1.5em",
          "family": "Helvetica, sans-serif"
        }
      },
      "code": {
        "theme": "tomorrow-night"
      },
      "meta": {
        "lang": "en",
        "title": "My Project",
        "description": "Welcome to my project.",
        "keywords": "awesome, cool",
        "author": "John Programmer",
        "favicon": "icon.png"
      },
      "footer": {
        "copyright": "(c) 2020 John Programmer"
      }
    }
  }
}
```

- `docolatte`
  - `branding`
    - **`title`** &mdash; Title of the entire site. Used in the top left header
    - **`link`** &mdash; Link URL in the header
    - **`icon`** &mdash; Icon for the link in the header (default: `"home"`). See: [feathericons.com](https://feathericons.com/)
    - `font`
      - **`size`** &mdash; Font size of the title
      - **`family`** &mdash; Font family of the title
  - `code`
    - **`theme`** &mdash; Theme for code blocks (default: `"tomorrow-night-eighties"`). See: [themes](https://github.com/jmblog/color-themes-for-google-code-prettify)
  - `meta`
    - **`lang`** &mdash; `lang` attribute of `<html>` (default: `"en"`)
    - **`title`** &mdash; Content of `<title>` element (defaults to `branding.title`)
    - **`description`** &mdash; `content` attribute of `<meta name="description">`
    - **`keywords`** &mdash; `content` attribute of `<meta name="keywords">`
    - **`author`** &mdash; `content` attribute of `<meta name="author">`
    - **`favicon`** &mdash; Favicon image URL. Use array for multiple files
  - `footer`
    - **`copyright`** &mdash; Copyright text. Used in the footer
    - **`hide`** &mdash; Whether to hide the entire footer ( `true` | `false` )
- **`default`** &mdash; All the [options](https://jsdoc.app/about-configuring-default-template.html) for the JSDoc's default theme are also compatible with docolatte

More options are planned to be implemented in the future.

## Thanks
[Docdash](https://github.com/clenemt/docdash) &mdash; Lodash inspired JSDoc 3 template/theme

## License
**docolatte** is licensed under the [Apache License 2.0](https://github.com/amekusa/docolatte/blob/trunk/LICENSE).
