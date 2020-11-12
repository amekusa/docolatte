# docolatte

A theme for JSDoc 3.

![screenshot-desktop](https://raw.githubusercontent.com/amekusa/docolatte/trunk/gallery/desktop.png)

[More Screenshots](https://github.com/amekusa/docolatte/tree/trunk/gallery)

## Features

- Responsive
- Focused on legibility
- Colorful, but not distracting
- Customizable options for branding your project


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
  ...
  "opts": {
    "template": "node_modules/docolatte",
  }
  ...
}
```

## Customize

Docolatte supports some configuration options to customize the end result.

```json
// Configuration Example
{
  ...
  "templates": {
    "docolatte": {
      "branding": {
        "title": "My Project",
        "link": "https://example.com/project/"
      },
      "footer": {
        "copyright": "(c) 2020 John Doe"
      }
    }
  }
  ...
}
```

#### Available Options

- `docolatte`
  - `branding`
  	- `title` :  Title of the documentations. Used in the top left header
  	- `link` :  Link URL of the header
  - `footer`
  	- `copyright` :  Copyright text. Used in the footer
  	- `hide` :  Whether to hide the entire footer ( `true` | `false` )
- `default` :  All the [options](https://jsdoc.app/about-configuring-default-template.html) for the JSDoc's default theme are also compatible with docolatte

More options are planned to be implemented in the future.
