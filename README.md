# Docolatte

A theme for JSDoc 3.

## Features

- Responsive
- Focused on legibility
- Colorful, but not distracting
- Customizable options for your branding


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
  "docolatte": {
    "branding": {
      "title": "My Project",
      "link": "https://example.com/project/"
    }
  }
  ...
}
```

#### Available Options

- `docolate`
	- `branding`
		- `title` &mdash; Title of the documentations. Used in the top left header
		- `link` &mdash; Link URL of the top left header

More options are planned to be implemented in the future.
