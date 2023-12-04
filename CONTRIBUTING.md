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

## How to debug
```sh
npm run debug
```

This command initiates a debugging process.
Then, you attach a debugger to the process.

For a debugger, you have 2 options:
- Google Chrome (or Chromium)
- VS Code

#### Google Chrome (or Chromium)
Open `chrome://inspect`. Then, click `inspect`.

#### VS Code
Run command: `Debug: Attach to Node Process`. Then, choose the correct process to attach.

To end debugging process, type `.exit` in terminal:

```sh
debug> .exit
```

## Technical references
- [TaffyDB: Writing Queries](https://taffydb.com/writing_queries.html)
- [Fuse.js: API/Options](https://www.fusejs.io/api/options.html)