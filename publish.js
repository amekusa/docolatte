const doop = require('jsdoc/util/doop');
const env = require('jsdoc/env');
const fs = require('jsdoc/fs');
const helper = require('jsdoc/util/templateHelper');
const logger = require('jsdoc/util/logger');
const path = require('jsdoc/path');
const { taffy } = require('@jsdoc/salty');
const template = require('jsdoc/template');
const util = require('util');
const Fuse = require('fuse.js');

const htmlsafe = helper.htmlsafe;
const linkto = helper.linkto;
const resolveAuthorLinks = helper.resolveAuthorLinks;
const hasOwnProp = Object.prototype.hasOwnProperty;

let data;
let view;

let outdir = path.normalize(env.opts.destination);

/**
 * DB for search
 * @author amekusa
 */
class SearchDB {
    constructor(options) {
        this.options = options;
        this.records = [];
    }
    feed(record) {
        if (Array.isArray(record)) {
            for (let item of record) this.feed(item);
            return;
        }
        if (this.has(record, '___id')) {
            console.warn('[SearchDB]', 'duplicated feed:', record);
            return;
        }
        this.records.push(record);
    }
    has(record, key) {
        if (!(key in record)) return false;
        for (let item of this.records) {
            if (!(key in item)) continue;
            if (record[key] === item[key]) return true;
        }
        return false;
    }
    serialize() {
        console.log(`Serializing search DB...`);
        let list = [];
        for (let record of this.records) {
            let item = { url: helper.createLink(record) };
            for (let key of this.options.keys) {
                if (!(key.name in record)) continue;
                item[key.name] = record[key.name];
            }
            list.push(item);
        }

        let index = Fuse.createIndex(this.options.keys, list);
        console.log(`${list.length} records have been found`);

        return {
            list: JSON.stringify(list),
            index: JSON.stringify(index.toJSON()),
            options: JSON.stringify(this.options)
        };
    }
}

/**
 * Merges 2 objects recursively
 * @return {object}
 * @author amekusa
 */
function merge(x, y) {
    if (typeof x != 'object' || typeof y != 'object') return y;

    if (Array.isArray(x)) {
        if (Array.isArray(y)) return x.concat(y);
        return y;
    } else if (Array.isArray(y)) return y;

    var r = {};
    for (var i in x) r[i] = (i in y) ? merge(x[i], y[i]) : x[i];
    for (var i in y) {
        if (!(i in x)) r[i] = y[i];
    }
    return r;
}

/**
 * Formats an array to a <UL> list.
 * If the array has only 1 item, omits <UL> and <LI> tags
 * @return {string}
 * @author amekusa
 */
function list(items, forEach = null) {
    if (!items || !items.length) return '';
    if (!forEach) forEach = item => item;
    if (items.length = 1) return forEach(items[0]);
    let r = '';
    items.forEach(item => {
        r += '<li>' + forEach(item) + '</li>';
    });
    return `<ul>${r}</ul>`;
}

/**
 * Returns the language of the given file
 * @return {string}
 * @author amekusa
 */
function lang(file) {
    let ext = path.extname(file);
    return ext.length > 1 ? ext.substring(1) : '';
}

/**
 * Appends the 1st string to the 2nd string
 * @return {string}
 * @author amekusa
 */
function append(str, to = ' ') {
    return str ? (to + str) : '';
}

/**
 * Prepends the 1st string to the 2nd string
 * @return {string}
 * @author amekusa
 */
function prepend(str, to = ' ') {
    return str ? (str + to) : '';
}

/**
 * Truncates the parts between `<!--TRUNCATE:START-->` and `<!--TRUNCATE:END-->` in the given string
 * @param {string} str
 * @return {string}
 * @author amekusa
 */
function truncate(str) {
    return str.replaceAll(/<!--+\s*TRUNCATE:START\s*--+>.*?<!--+\s*TRUNCATE:END\s*--+>/gs, '<!-- TRUNCATED -->');
}

/**
 * Iterates over the given array
 * @param {any[]} arr
 * @param {function} fn
 */
function iterate(arr, fn) {
    for (let i = 0; i < arr.length; i++) fn(arr[i], i, arr.length - 1);
}

function find(spec) {
    return helper.find(data, spec);
}

function tutoriallink(tutorial) {
    return helper.toTutorial(tutorial, null, {
        tag: 'em',
        classname: 'disabled',
        prefix: 'Tutorial: '
    });
}

function getAncestorLinks(doclet) {
    return helper.getAncestorLinks(data, doclet);
}

function hashToLink(doclet, hash) {
    let url;

    if ( !/^(#.+)/.test(hash) ) {
        return hash;
    }

    url = helper.createLink(doclet);
    url = url.replace(/(#.+|$)/, hash);

    return `<a href="${url}">${hash}</a>`;
}

function needsSignature({kind, type, meta}) {
    let needsSig = false;

    // function and class definitions always get a signature
    if (kind === 'function' || kind === 'class') {
        needsSig = true;
    }
    // typedefs that contain functions get a signature, too
    else if (kind === 'typedef' && type && type.names &&
        type.names.length) {
        for (let i = 0, l = type.names.length; i < l; i++) {
            if (type.names[i].toLowerCase() === 'function') {
                needsSig = true;
                break;
            }
        }
    }
    // and namespaces that are functions get a signature (but finding them is a
    // bit messy)
    else if (kind === 'namespace' && meta && meta.code &&
        meta.code.type && meta.code.type.match(/[Ff]unction/)) {
        needsSig = true;
    }

    return needsSig;
}

function getSignatureAttributes({optional, nullable}) {
    const attributes = [];

    if (optional) {
        attributes.push('opt');
    }

    if (nullable === true) {
        attributes.push('nullable');
    }
    else if (nullable === false) {
        attributes.push('non-null');
    }

    return attributes;
}

function updateItemName(item) {
    const attributes = getSignatureAttributes(item);
    let itemName = item.name || '';

    if (item.variable) {
        itemName = `&hellip;${itemName}`;
    }

    if (attributes && attributes.length) {
        itemName = util.format( '%s<sup class="signature-attributes">%s</sup>', itemName,
            attributes.join(', ') );
    }

    return itemName;
}

function addParamAttributes(params) {
    return params.filter(({name}) => name && !name.includes('.')).map(updateItemName);
}

function buildItemTypeStrings(item) {
    const types = [];

    if (item && item.type && item.type.names) {
        item.type.names.forEach(name => {
            types.push( linkto(name, htmlsafe(name)) );
        });
    }

    return types;
}

function buildAttribsString(attribs) {
    let attribsString = '';

    if (attribs && attribs.length) {
        attribsString = htmlsafe( util.format('(%s) ', attribs.join(', ')) );
    }

    return attribsString;
}

function addNonParamAttributes(items) {
    let types = [];

    items.forEach(item => {
        types = types.concat( buildItemTypeStrings(item) );
    });

    return types;
}

function addSignatureParams(f) {
    const params = f.params ? addParamAttributes(f.params) : [];

    f.signature = util.format( '%s(%s)', (f.signature || ''), params.join(', ') );
}

function addSignatureReturns(f) {
    const attribs = [];
    let attribsString = '';
    let returnTypes = [];
    let returnTypesString = '';
    const source = f.yields || f.returns;

    // jam all the return-type attributes into an array. this could create odd results (for example,
    // if there are both nullable and non-nullable return types), but let's assume that most people
    // who use multiple @return tags aren't using Closure Compiler type annotations, and vice-versa.
    if (source) {
        source.forEach(item => {
            helper.getAttribs(item).forEach(attrib => {
                if (!attribs.includes(attrib)) {
                    attribs.push(attrib);
                }
            });
        });

        attribsString = buildAttribsString(attribs);
    }

    if (source) {
        returnTypes = addNonParamAttributes(source);
    }
    if (returnTypes.length) {
        returnTypesString = util.format( ' &rarr; %s<span class="type">%s</span>', attribsString, returnTypes.join('<i class="sep"></i>') );
    }

    f.signature = `<span class="signature">${f.signature || ''}</span><span class="type-signature">${returnTypesString}</span>`;
}

function addSignatureTypes(f) {
    const types = f.type ? buildItemTypeStrings(f) : [];
    const typesString = types.length ? (' <span class="type">' + types.join('<i class="sep"></i>') + '</span>') : '';

    f.signature = `${f.signature || ''}<span class="type-signature">${typesString}</span>`;
}

function addAttribs(f) {
    const attribs = helper.getAttribs(f);
    const attribsString = attribs.map(item => `<span class="attribute">${htmlsafe(item)}</span>`).join('')

    f.attribs = util.format('<span class="attributes">%s</span>', attribsString);
}

function shortenPaths(files, commonPrefix) {
    Object.keys(files).forEach(file => {
        files[file].shortened = files[file].resolved.replace(commonPrefix, '')
            // always use forward slashes
            .replace(/\\/g, '/');
    });

    return files;
}

function getPathFromDoclet({meta}) {
    if (!meta) {
        return null;
    }

    return meta.path && meta.path !== 'null' ?
        path.join(meta.path, meta.filename) :
        meta.filename;
}

function generate(title, docs, filename, resolveLinks) {
    let docData;
    let html;
    let outpath;

    resolveLinks = resolveLinks !== false;

    docData = {
        env: env,
        title: title,
        docs: docs
    };

    outpath = path.join(outdir, filename);
    html = view.render('container.tmpl', docData);

    if (resolveLinks) {
        html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>
    }

    // insert data
    html = html.replace('<!-- %DOCOLATTE::DATA_GOES_HERE% -->', view.partial('data.tmpl'));

    fs.writeFileSync(outpath, html, 'utf8');
}

function generateSourceFiles(sourceFiles, encoding = 'utf8') {
    Object.keys(sourceFiles).forEach(file => {
        let source;
        // links are keyed to the shortened path in each doclet's `meta.shortpath` property
        const sourceOutfile = helper.getUniqueFilename(sourceFiles[file].shortened);

        helper.registerLink(sourceFiles[file].shortened, sourceOutfile);

        try {
            source = {
                kind: 'source',
                lang: lang(file),
                code: helper.htmlsafe( fs.readFileSync(sourceFiles[file].resolved, encoding) )
            };
        }
        catch (e) {
            logger.error('Error while generating source file %s: %s', file, e.message);
        }

        generate(`Source: ${sourceFiles[file].shortened}`, [source], sourceOutfile,
            false);
    });
}

/**
 * Look for classes or functions with the same name as modules (which indicates that the module
 * exports only that class or function), then attach the classes or functions to the `module`
 * property of the appropriate module doclets. The name of each class or function is also updated
 * for display purposes. This function mutates the original arrays.
 *
 * @private
 * @param {Array.<module:jsdoc/doclet.Doclet>} doclets - The array of classes and functions to
 * check.
 * @param {Array.<module:jsdoc/doclet.Doclet>} modules - The array of module doclets to search.
 */
function attachModuleSymbols(doclets, modules) {
    const symbols = {};

    // build a lookup table
    doclets.forEach(symbol => {
        symbols[symbol.longname] = symbols[symbol.longname] || [];
        symbols[symbol.longname].push(symbol);
    });

    modules.forEach(module => {
        if (symbols[module.longname]) {
            module.modules = symbols[module.longname]
                // Only show symbols that have a description. Make an exception for classes, because
                // we want to show the constructor-signature heading no matter what.
                .filter(({description, kind}) => description || kind === 'class')
                .map(symbol => {
                    symbol = doop(symbol);

                    if (symbol.kind === 'class' || symbol.kind === 'function') {
                        symbol.name = `${symbol.name.replace('module:', '(require("')}"))`;
                    }

                    return symbol;
                });
        }
    });
}

function buildMemberNav(items, itemHeading, itemsSeen, linktoFn) {
    let nav = '';

    if (items.length) {
        let itemsNav = '';

        items.forEach(item => {

            if ( !hasOwnProp.call(item, 'longname') ) {
                itemsNav += '<li>' + linktoFn('', item.name) + '</li>';

            } else if ( !hasOwnProp.call(itemsSeen, item.longname) ) {
                itemsNav += `<li>`;

                let displayName = env.conf.templates.default.useLongnameInNav ? item.longname : item.name;
                itemsNav += linktoFn(item.longname, displayName.replace(/\b(module|event):/g, ''));

                let methods = find({ kind:'function', memberof: item.longname });
                if (methods.length) {
                    itemsNav += `<ul class="methods">`;
                    methods.forEach(method => {
                        itemsNav += `<li>${linkto(method.longname, method.name)}</li>`;
                    });
                    itemsNav += `</ul>`;
                }
                itemsNav += `</li>`;
                itemsSeen[item.longname] = true;
            }
        });

        if (itemsNav !== '') {
            nav += `<nav><h3>${itemHeading}</h3><ul>${itemsNav}</ul></nav>`;
        }
    }

    return nav;
}

function linktoTutorial(longName, name) {
    return tutoriallink(name);
}

function linktoExternal(longName, name) {
    return linkto(longName, name.replace(/(^"|"$)/g, ''));
}

/**
 * Create the navigation sidebar.
 * @param {object} members The members that will be used to create the sidebar.
 * @param {array<object>} members.classes
 * @param {array<object>} members.externals
 * @param {array<object>} members.globals
 * @param {array<object>} members.mixins
 * @param {array<object>} members.modules
 * @param {array<object>} members.namespaces
 * @param {array<object>} members.tutorials
 * @param {array<object>} members.events
 * @param {array<object>} members.interfaces
 * @return {string} The HTML for the navigation sidebar.
 */
function buildNav(members) {
    let globalNav;
    let nav = '';

    // search box
    nav += view.partial('search-box.tmpl');

    const seen = {};
    const seenTutorials = {};

    nav += buildMemberNav(members.modules, 'Modules', {}, linkto);
    nav += buildMemberNav(members.externals, 'Externals', seen, linktoExternal);
    nav += buildMemberNav(members.namespaces, 'Namespaces', seen, linkto);
    nav += buildMemberNav(members.classes, 'Classes', seen, linkto);
    nav += buildMemberNav(members.interfaces, 'Interfaces', seen, linkto);
    nav += buildMemberNav(members.events, 'Events', seen, linkto);
    nav += buildMemberNav(members.mixins, 'Mixins', seen, linkto);
    nav += buildMemberNav(members.tutorials, 'Tutorials', seenTutorials, linktoTutorial);

    if (members.globals.length) {
        globalNav = '';

        members.globals.forEach(({kind, longname, name}) => {
            if ( kind !== 'typedef' && !hasOwnProp.call(seen, longname) ) {
                globalNav += `<li>${linkto(longname, name)}</li>`;
            }
            seen[longname] = true;
        });

        if (!globalNav) {
            // turn the heading into a link so you can actually get to the global page
            nav += `<nav><h3>${linkto('global', 'Global')}</h3></nav>`;
        }
        else {
            nav += `<nav><h3>Global</h3><ul>${globalNav}</ul></nav>`;
        }
    }

    return nav;
}

/**
    @param {TAFFY} taffyData See <http://taffydb.com/>.
    @param {object} opts
    @param {Tutorial} tutorials
 */
exports.publish = (taffyData, opts, tutorials) => {
    let classes;
    let conf;
    let externals;
    let files;
    let fromDir;
    let globalUrl;
    let indexUrl;
    let interfaces;
    let members;
    let mixins;
    let modules;
    let namespaces;
    let outputSourceFiles;
    let packageInfo;
    let packages;
    const sourceFilePaths = [];
    let sourceFiles = {};
    let staticFileFilter;
    let staticFilePaths;
    let staticFiles;
    let staticFileScanner;
    let templatePath;

    data = taffyData;

    conf = env.conf.templates || {};
    conf.default = conf.default || {};

    // theme configs
    var x = merge({
        minify: true,
        meta: {
            lang: 'en',
            title: null,
            description: null,
            keywords: null,
            author: null,
            favicon: []
        },
        branding: {
            title: 'My Project',
            link: 'index.html',
            icon: 'home',
            font: {
                size: null,
                family: null
            }
        },
        readme: {
            truncate: true
        },
        footer: {
            hide: false,
            hideGenerator: false
        },
        code: {
            theme: 'base16/espresso'
            // theme: 'atom-one-dark'
        }

    }, conf.docolatte || {});

    if (!x.meta.title) x.meta.title = x.branding.title;
    if (typeof x.meta.favicon == 'string') x.meta.favicon = [x.meta.favicon];

    // custom style
    x.style = '';
    if (x.branding.font.size || x.branding.font.family) {
        x.style += `.masthead .branding .title { `;
        if (x.branding.font.size)   x.style += `font-size: ${x.branding.font.size}; `;
        if (x.branding.font.family) x.style += `font-family: ${x.branding.font.family}; `;
        x.style += `}`;
    }
    conf.docolatte = x;

    templatePath = path.normalize(opts.template);
    view = new template.Template( path.join(templatePath, 'tmpl') );

    // claim some special filenames in advance, so the All-Powerful Overseer of Filename Uniqueness
    // doesn't try to hand them out later
    indexUrl = helper.getUniqueFilename('index');
    // don't call registerLink() on this one! 'index' is also a valid longname

    globalUrl = helper.getUniqueFilename('global');
    helper.registerLink('global', globalUrl);

    // set up templating
    view.layout = conf.default.layoutFile ?
        path.getResourcePath(path.dirname(conf.default.layoutFile),
            path.basename(conf.default.layoutFile) ) :
        'layout.tmpl';

    // set up tutorials for helper
    helper.setTutorials(tutorials);

    // cull the members of @ignore'd classes
    data({ ignore: true, kind: 'class' }).each(item => {
        if (!('name' in item)) return;
        data({ memberof: item.name }).remove();
    });

    data = helper.prune(data);
    data.sort('longname, version, since');
    helper.addEventListeners(data);

    data().each(doclet => {
        let sourcePath;

        doclet.attribs = '';

        if (doclet.examples) {
            let language = '';
            if (doclet.meta && doclet.meta.filename) language = lang(doclet.meta.filename);

            doclet.examples = doclet.examples.map(example => {
                let caption;
                let code;

                let found = example.match(/^\s*<caption>([\s\S]+?)<\/caption>(\s*[\n\r])([\s\S]+)$/i);
                if (found) {
                    caption = found[1];
                    code = found[3];
                }

                return {
                    lang: language,
                    caption: caption || '',
                    code: code || example
                };
            });
        }
        if (doclet.see) {
            doclet.see.forEach((seeItem, i) => {
                doclet.see[i] = hashToLink(doclet, seeItem);
            });
        }

        // build a list of source files
        if (doclet.meta) {
            sourcePath = getPathFromDoclet(doclet);
            sourceFiles[sourcePath] = {
                resolved: sourcePath,
                shortened: null
            };
            if (!sourceFilePaths.includes(sourcePath)) {
                sourceFilePaths.push(sourcePath);
            }
        }
    });

    // update outdir if necessary, then create outdir
    packageInfo = ( find({kind: 'package'}) || [] )[0];
    if (packageInfo && packageInfo.name) {
        outdir = path.join( outdir, packageInfo.name, (packageInfo.version || '') );
    }
    fs.mkPath(outdir);

    // copy files from node_modules
    let min = conf.docolatte.minify ? '.min' : '';
    let moduleFiles = [
        { dst: 'assets', src: 'feather-icons/dist/feather-sprite.svg' },
        { dst: 'styles', src: `simplebar/dist/simplebar${min}.css` }
    ];
    if (conf.docolatte.code.theme) {
        moduleFiles.push({
            dst: path.join('styles/hljs', path.dirname(conf.docolatte.code.theme)),
            src: `highlight.js/styles/${conf.docolatte.code.theme}.css`
        });
    }
    moduleFiles.forEach(file => {
        let dst = path.join(outdir, file.dst);
        let src = require.resolve(file.src);
        fs.mkPath(dst);
        fs.copyFileSync(src, dst);
    });

    // copy the template's static files to outdir
    fromDir = path.join(templatePath, 'static');
    staticFiles = fs.ls(fromDir, 3);

    staticFiles.forEach(fileName => {
        const toDir = fs.toDir( fileName.replace(fromDir, outdir) );

        fs.mkPath(toDir);
        fs.copyFileSync(fileName, toDir);
    });

    // copy user-specified static files to outdir
    if (conf.default.staticFiles) {
        // The canonical property name is `include`. We accept `paths` for backwards compatibility
        // with a bug in JSDoc 3.2.x.
        staticFilePaths = conf.default.staticFiles.include ||
            conf.default.staticFiles.paths ||
            [];
        staticFileFilter = new (require('jsdoc/src/filter').Filter)(conf.default.staticFiles);
        staticFileScanner = new (require('jsdoc/src/scanner').Scanner)();

        staticFilePaths.forEach(filePath => {
            let extraStaticFiles;

            filePath = path.resolve(env.pwd, filePath);
            extraStaticFiles = staticFileScanner.scan([filePath], 10, staticFileFilter);

            extraStaticFiles.forEach(fileName => {
                const sourcePath = fs.toDir(filePath);
                const toDir = fs.toDir( fileName.replace(sourcePath, outdir) );

                fs.mkPath(toDir);
                fs.copyFileSync(fileName, toDir);
            });
        });
    }

    if (sourceFilePaths.length) {
        sourceFiles = shortenPaths( sourceFiles, path.commonPrefix(sourceFilePaths) );
    }
    data().each(doclet => {
        let docletPath;
        const url = helper.createLink(doclet);

        helper.registerLink(doclet.longname, url);

        // add a shortened version of the full path
        if (doclet.meta) {
            docletPath = getPathFromDoclet(doclet);
            docletPath = sourceFiles[docletPath].shortened;
            if (docletPath) {
                doclet.meta.shortpath = docletPath;
            }
        }
    });

    data().each(doclet => {
        const url = helper.longnameToUrl[doclet.longname];

        if (url.includes('#')) {
            doclet.id = helper.longnameToUrl[doclet.longname].split(/#/).pop();
        }
        else {
            doclet.id = doclet.name;
        }

        if ( needsSignature(doclet) ) {
            addSignatureParams(doclet);
            addSignatureReturns(doclet);
            addAttribs(doclet);
        }
    });

    // do this after the urls have all been generated
    data().each(doclet => {
        doclet.ancestors = getAncestorLinks(doclet);

        if (doclet.kind === 'member') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
        }

        if (doclet.kind === 'constant') {
            addSignatureTypes(doclet);
            addAttribs(doclet);
            doclet.kind = 'member';
        }
    });

    members = helper.getMembers(data);
    members.tutorials = tutorials.children;

    // output pretty-printed source files by default
    outputSourceFiles = conf.default && conf.default.outputSourceFiles !== false;

    // add template helpers
    view.find = find;
    view.linkto = linkto;
    view.resolveAuthorLinks = resolveAuthorLinks;
    view.tutoriallink = tutoriallink;
    view.htmlsafe = htmlsafe;
    view.outputSourceFiles = outputSourceFiles;
    view.list = list;
    view.append = append;
    view.prepend = prepend;
    view.truncate = truncate;
    view.iterate = iterate;
    view.theme = conf.docolatte;

    // DB for search
    let searchDb = new SearchDB({
        keys: [
            { name: 'name', weight: 10 },
            { name: 'longname', weight: 9 },
            { name: 'classdesc', weight: 6 },
            { name: 'description', weight: 6 },
            { name: 'examples', weight: 1 },
        ]
    });

    // feed records to the DB
    for (let i in members) searchDb.feed(members[i]);
    data({
        kind: ['member', 'function', 'constant', 'typedef'],
        memberof: { isUndefined: false } // not global
    }).each(item => { searchDb.feed(item) });

    // serialize the DB
    view.search = searchDb.serialize();

    // once for all
    view.nav = buildNav(members);
    attachModuleSymbols( find({ longname: {left: 'module:'} }), members.modules );

    // generate the pretty-printed source files first so other pages can link to them
    if (outputSourceFiles) {
        generateSourceFiles(sourceFiles, opts.encoding);
    }

    if (members.globals.length) { generate('Global', [{kind: 'globalobj'}], globalUrl); }

    // index page displays information from package.json and lists files
    files = find({kind: 'file'});
    packages = find({kind: 'package'});

    generate('Home',
        packages.concat(
            [{
                kind: 'mainpage',
                readme: opts.readme,
                longname: (opts.mainpagetitle) ? opts.mainpagetitle : 'Main Page'
            }]
        ).concat(files), indexUrl);

    // set up the lists that we'll use to generate pages
    classes = taffy(members.classes);
    modules = taffy(members.modules);
    namespaces = taffy(members.namespaces);
    mixins = taffy(members.mixins);
    externals = taffy(members.externals);
    interfaces = taffy(members.interfaces);

    Object.keys(helper.longnameToUrl).forEach(longname => {
        const myClasses = helper.find(classes, {longname: longname});
        const myExternals = helper.find(externals, {longname: longname});
        const myInterfaces = helper.find(interfaces, {longname: longname});
        const myMixins = helper.find(mixins, {longname: longname});
        const myModules = helper.find(modules, {longname: longname});
        const myNamespaces = helper.find(namespaces, {longname: longname});

        if (myModules.length) {
            generate(`Module: ${myModules[0].name}`, myModules, helper.longnameToUrl[longname]);
        }

        if (myClasses.length) {
            generate(`Class: ${myClasses[0].name}`, myClasses, helper.longnameToUrl[longname]);
        }

        if (myNamespaces.length) {
            generate(`Namespace: ${myNamespaces[0].name}`, myNamespaces, helper.longnameToUrl[longname]);
        }

        if (myMixins.length) {
            generate(`Mixin: ${myMixins[0].name}`, myMixins, helper.longnameToUrl[longname]);
        }

        if (myExternals.length) {
            generate(`External: ${myExternals[0].name}`, myExternals, helper.longnameToUrl[longname]);
        }

        if (myInterfaces.length) {
            generate(`Interface: ${myInterfaces[0].name}`, myInterfaces, helper.longnameToUrl[longname]);
        }
    });

    // TODO: move the tutorial functions to templateHelper.js
    function generateTutorial(title, tutorial, filename) {
        const tutorialData = {
            title: title,
            header: tutorial.title,
            content: tutorial.parse(),
            children: tutorial.children
        };
        const tutorialPath = path.join(outdir, filename);
        let html = view.render('tutorial.tmpl', tutorialData);

        // yes, you can use {@link} in tutorials too!
        html = helper.resolveLinks(html); // turn {@link foo} into <a href="foodoc.html">foo</a>

        fs.writeFileSync(tutorialPath, html, 'utf8');
    }

    // tutorials can have only one parent so there is no risk for loops
    function saveChildren({children}) {
        children.forEach(child => {
            generateTutorial(`Tutorial: ${child.title}`, child, helper.tutorialToUrl(child.name));
            saveChildren(child);
        });
    }

    saveChildren(tutorials);
};
