# Docolatte
:chocolate_bar: Bittersweet theme for JSDoc 3

[![npm package](https://img.shields.io/badge/dynamic/json?label=npm%0Apackage&query=%24%5B%27dist-tags%27%5D%5B%27latest%27%5D&url=https%3A%2F%2Fregistry.npmjs.org%2Fdocolatte%2F)](https://www.npmjs.com/package/docolatte)


## Notes for users

### Changelog
See: [CHANGELOG.md](https://github.com/amekusa/docolatte/blob/trunk/CHANGELOG.md)

### About JSDoc 4 Compatibility
Indexing for search is not perfectly working with jsdoc@4.0.0.
I recommend sticking with jsdoc 3.


## Screenshots
![screenshot class](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/class.png)
![screenshot methods](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/methods.png)
![screenshot source](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/source.png)
![screenshot mobile](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/mobile.png)![screenshot mobile menu](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/mobile-menu.png)

(The sample codes in the screenshots are derived from [docdash/fixtures](https://github.com/clenemt/docdash/tree/master/fixtures))

[All screenshots](https://github.com/amekusa/docolatte/tree/trunk/gallery)


## Features
- Responsive
- Colorful, but not distracting
- Quick, indexed search
- Code highlighting with [highlight.js](https://highlightjs.org/)
- Customizability
  - All the highlight.js themes are supported
  - Header text, URL, and icon
  - Copyright & license text on the footer

### Keyboard-only Search & Navigation
![screenshot search demo](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/search-demo.gif)

### Interactive TOC (Table of Contents)
![screenshot navigation demo](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/nav-demo.gif)

More features are planned: [TODO.md](https://github.com/amekusa/docolatte/tree/trunk/TODO.md)


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
You can customize docolatte by setting options in JSDoc configuration file like this:

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


## Thanks
[Docdash](https://github.com/clenemt/docdash) …… Lodash inspired JSDoc 3 template/theme


## License
Docolatte is licensed under the [Apache License 2.0](https://github.com/amekusa/docolatte/blob/trunk/LICENSE.md).
