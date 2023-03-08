# Docolatte
:chocolate_bar: Bittersweet theme for JSDoc 3

[![npm package](https://img.shields.io/badge/dynamic/json?label=npm%0Apackage&query=%24%5B%27dist-tags%27%5D%5B%27latest%27%5D&url=https%3A%2F%2Fregistry.npmjs.org%2Fdocolatte%2F)](https://www.npmjs.com/package/docolatte)

<!-- TOC depthfrom:2 -->

- [Notes for users](#notes-for-users)
- [Screenshots](#screenshots)
- [Features](#features)
    - [Keyboard-only Search & Navigation](#keyboard-only-search--navigation)
    - [Interactive TOC Table of Contents](#interactive-toc-table-of-contents)
- [Install](#install)
- [Usage](#usage)
- [Customize](#customize)
    - [Available Options](#available-options)
- [Custom Assets](#custom-assets)
    - [More complex options](#more-complex-options)
        - [Loading remote CSS & JS](#loading-remote-css--js)
        - [Importing Node modules](#importing-node-modules)
        - [Private import](#private-import)
        - [Ordering imports](#ordering-imports)
- [Thanks](#thanks)
- [License](#license)

<!-- /TOC -->

## Notes for users
What's new in the latest update?
> See: [CHANGELOG.md](https://github.com/amekusa/docolatte/blob/trunk/CHANGELOG.md)

What's coming out in the next update?
> See: [TODO.md](https://github.com/amekusa/docolatte/tree/trunk/TODO.md)

Is this compatible with JSDoc v4.x?
> Search-indexing partially breaks with jsdoc@4.0.0. I recommend sticking with jsdoc v3.


## Screenshots
![screenshot class](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/class.png)
![screenshot methods](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/methods.png)
![screenshot source](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/source.png)
![screenshot mobile](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/mobile.png)![screenshot mobile menu](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/mobile-menu.png)

(The sample codes in the screenshots are derived from [docdash/fixtures](https://github.com/clenemt/docdash/tree/master/fixtures))

[All screenshots](https://github.com/amekusa/docolatte/tree/trunk/gallery)


## Features
- Responsive with wide variety of screen width
- Colorful, but not distracting
- Indexed search which is quick
- Code highlighting with [highlight.js](https://highlightjs.org/)
- Customizability
  - All the highlight.js themes are supported
  - Header text, URL, and icon
  - Copyright & license text on the footer
  - Custom CSS and JS

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
You can customize docolatte by setting options in JSDoc configuration file like this example:

```json
{
  "templates": {
    "docolatte": {
      "imports": [ ... ],
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
        "theme": "nord"
      },
      "meta": {
        "title":       "My Project",
        "description": "Welcome to my project.",
        "keywords":    "awesome, cool",
      },
      "footer": {
        "copyright": "&copy; 2023 John Programmer",
        "license":   "Licensed under the Apache License 2.0"
      }
    }
  }
}
```

### Available Options
The following list is written in YAML format only for the sake of readability.
You need to write the actual config in JSON format just like the above example.

```yml
# Docolatte specific options
templates.docolatte:
  minify: Whether to use minified JS and CSS [default: true]

  imports: Custom asset files to import (Explained later)

  branding: # Settings for the header on the top left
    title: Title text
    link:  Link URL of the title
    icon:  Icon on the left [default: "home"] # See https://feathericons.com/

    font:  # Font settings for the title
      size:   Font size
      family: Font family

  code: # Settings for code blocks
    theme: highlight.js theme [default: "base16/espresso"] # See https://highlightjs.org/static/demo/

  home: # Settings for the home page (index.html)
    package: # Settings for package.json info
      hide: Whether to hide the info [default: false]

  readme: # Settings for README & tutorials
    truncate: Whether to enable the truncation tags [default: true]
              # This removes the content between <!--TRUNCATE:START--> and <!--TRUNCATE:END-->

    emoji: # Settings for emoji conversion
      replace: Type(s) of emoji to be replaced [default: 'colons']
        # Available types:
        - 'colons'
        - 'unified'
        - 'emoticons'
        - 'emoticons_with_colons'

      options: # Options for js-emoji  # See https://github.com/iamcal/js-emoji
        replace_mode: [default: 'unified'],
        allow_native: [default: true]

  meta: # Settings for meta tags
    lang:        `lang` attribute of <html> [default: "en"]
    title:       Content of <title> element [defaults to `branding.title`]
    description: `content` attribute of <meta name="description">
    keywords:    `content` attribute of <meta name="keywords">
    author:      `content` attribute of <meta name="author">
    favicon:     Favicon image URL(s). Use array for multiple entries

  footer: # Settings for the footer
    copyright: Copyright text
    license:   License text
    hide:      Whether to hide the footer [true | false]

# All the options for the JSDoc's default theme are also compatible with Docolatte
templates.default: { ... } # See https://jsdoc.app/about-configuring-default-template.html
```

## Custom Assets
With **`imports`** option, you can import **user-specific assets** like CSS, JavaScript, or images, etc. to completely customize the look & feel of your documentation site.

```json
"imports": [
  "my_scripts/alfa.js",
  "my_styles/bravo.css",
  "my_fonts/charlie.woff"
]
```

This config results copying the files in the array to subdirectories under the JSDoc output directory.
The subdirectory name is determined by the file type of each import.

| File Ext. | File Type | Output Directory |
|----------:|:----------|:-----------------|
| `.js`     | script    | `scripts/`       |
| `.css`    | style     | `styles/`        |
| others    | asset     | `assets/`        |

And then, Docolatte writes the proper `<script>` and `<link>` tags linking to the imported scripts and styles in HTML like this:

```html
<head>
  ...
  <script src="scripts/alfa.js"></script>
  <link rel="stylesheet" href="styles/bravo.css">
  ...
</head>
```

### More complex options
Instead of just a filepath string, you can use an **object** to specify more complex rules for each file import.

```json
"imports": [
  { "src": "my_scripts/alfa.js",  "dst": "foo/bar" },
  { "src": "my_scripts/bravo.js", "dst": "foo/bar", "as": "delta.js" }
]
```

- **`dst`** property specifies the destination directory of import.
- **`as`** property specifies new filename for the imported file.

#### Loading remote CSS & JS
With **`resolve`** property, you can specify how Docolatte looks up the `src`.
If you set it to `false`, Docolatte won't check the file existence and attempt to copy, only write `<script>` (or `<link>` for *.css) tag linking to the `src` in HTML.

```json
"imports": [
  { "resolve": false, "src": "https://example.com/hello.js" }
]
```

#### Importing Node modules
By setting `resolve` property to `'module'`, you can import files from Node modules that you installed via `package.json` of your current project.

```json
"imports": [
  { "resolve": "module", "src": "p5/lib/p5.js" }
]
```

#### Private import
If you set **`private`** property to `true`, Docolatte will copy the file to the JSDoc ouput directory normally, but won't write `<script>` (or `<link>` for styles) tags linking to it in HTML.

This is useful if you want to `@import` a CSS file from other CSS.

```json
"imports": [
  { "src": "my_styles/style.css" },
  { "src": "my_styles/variables.css", "private": true }
]
```
```css
/* style.css */
@import "variables.css";
```

#### Ordering imports
The order of `<script>` and `<link>` tags for imports is determined by **`order`** property of each import.
The default value of `order` is `0`. The greater the value, the lower the tag is placed.
Negative value makes the tag gets loaded earlier than the default scripts & styles of Docolatte.

```json
"imports": [
  { "order": 5, "src": "second.css" },
  { "order": 5, "src": "third.css" },
  { "order": 2, "src": "first.css" }
]
```
```html
<head>
  ...
  <link rel="stylesheet" href="styles/first.css">
  <link rel="stylesheet" href="styles/second.css">
  <link rel="stylesheet" href="styles/third.css">
  ...
</head>
```

## Thanks
[Docdash](https://github.com/clenemt/docdash) …… Lodash inspired JSDoc 3 template/theme


## License
Docolatte is licensed under the [Apache License 2.0](https://github.com/amekusa/docolatte/blob/trunk/LICENSE.md).
