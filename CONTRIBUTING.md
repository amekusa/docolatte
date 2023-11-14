# Contributing
Docolatte is an open-source project developed by [@amekusa](https://github.com/amekusa), purely as a hobby.
Your contributions are always welcomed :-)

## Directory structure
```yml
publish.js: Site generator (Node.js, JSDoc)
lib/:  Library for publish.js
tmpl/: HTML templates for publish.js
static/: Front-end stuff (Needs build)
  _src/: Source code
gulpfile.js/: Build scripts
```

## Getting started
```sh
# Install dependencies to develop
npm i
```

## How to build
```sh
# For development
gulp dev

# For publish
gulp prod
```

## How to update deps
```sh
# Minor update
npm run bump

# Major update (Caution: This may break stuff)
npm run bump-major
```