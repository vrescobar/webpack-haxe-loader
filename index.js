'use_strict';

const loaderUtils = require('loader-utils');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const tokenize = require('yargs-parser/lib/tokenize-arg-string');

const haxeErrorParser = require('haxe-error-parser');
const problemMatcher = haxeErrorParser.problemMatcher;
const identifyError = haxeErrorParser.identifyError;


/**
 * Supported options:
 *  - options.server -> Adds the option to compiler's "--server" command line
 *  - options.debug -> Passes the flag "-debug" to the end of haxe's command
 *  - options.ignoreWarnings -> Ignores haxe's compile warnings warnings
 *  - options.logCommand -> Prints haxe's command when compiling
 *  - options.emitStdoutAsWarning -> Any STDOUT form haxe's compilation will be printed as warning
 */


module.exports = function (hxmlContent) {
    const context = this;
    const options = loaderUtils.getOptions(context) || {};
    context.cacheable && context.cacheable();
    const cb = context.async();

    let { jsOutputFiles, classpath, args } = prepare(options, hxmlContent);
    if (jsOutputFiles.length == 0 ) {
        emitError(new Error("webpack haxe loader could not find any js output at your hxml file."))
    }

    registerDependencies(context, options, classpath);
    // Execute the Haxe build.
    const haxeCommand = `haxe ${args.join(' ')}`;
    if (options.logCommand) console.log(haxeCommand);
    exec(haxeCommand, (err, stdout, stderr) => {
        // Parse errors and warnings
        if (stderr) {
            let errorIndex = 0;
            const lines = stderr.split('\n');

            lines.forEach(line => {
                if (!line || !identifyError(line)) return;
                const err = new Error(line);

                if (problemMatcher.test(line) && problemMatcher.exec(line)[6] === 'Warning') {
                    if (!options.ignoreWarnings) {
                        Object.assign(err, {index: ++errorIndex});
                        context.emitWarning(err);
                    }
                } else {
                    Object.assign(err, {index: ++errorIndex});
                    context.emitError(err);
                }
            });
        }

        if (stdout && options.emitStdoutAsWarning) {
            context.emitWarning(new Error('[HAXE STDOUT]\n' + stdout));
        }

        // Fail if haxe compilation failed
        if (err) {
            return cb(makeError('Compilation failed', haxeCommand));
        }
        jsOutputFiles.forEach(jsOutputFile => {
            var haxes_output = path.resolve(jsOutputFile);
            fs.readFile(haxes_output, "utf-8", function (err, js_output) {
                if (err) {
                    return callback(err);
                }
                // Small correction to pack Haxe's global namespace within a regular ES6 module
                const d_ts_dile = jsOutputFile.replace(/\.js$/i,'.d.ts')
                const js_to_inline = `/// <reference path="${d_ts_dile}>" />\nvar exports = module.exports;\n${js_output}\n`;
                const source_map_path = jsOutputFile + ".map";
                fs.readFile(source_map_path, "utf-8", function (err, sourceMapContent) {
                    if (!err) {
                        const with_sm = `${js_to_inline}\n//# sourceMappingURL=${source_map_path}`
                        cb(null, with_sm, JSON.parse(sourceMapContent));
                    } else {
                        cb(null, js_to_inline, null);
                    }
                })
            });
        });
    });
};


function makeError(reason, message) {
    const err = new Error(`Haxe Loader: ${reason}\n${message}`);
    err.stack = "";
    return err;
}


function registerDependencies(context, options, classpath) {
    // Listen for any changes in the classpath
    classpath.forEach(path => context.addContextDependency(path));

    if (options.watch != null && Array.isArray(options.watch)) {
        options.watch.forEach(
            path => context.addContextDependency(path)
        );
    }
}

function prepare(options, hxmlContent) {
    const classpath = [];
    const jsOutputFiles = [];
    var args = hxmlContent.split(/[\r\n]/).filter(l => !l.startsWith('#'));

    // Parse arguments for Haxe to find CP and JS
    const hxmlOptions = tokenize(args.join(" "));
    const len = hxmlOptions.length;
    for (let i = 0; i < len; i++) {
        const name = hxmlOptions[i];

        if ((name === '-js' || name === '--js')) {
            jsOutputFiles.push(hxmlOptions[++i]);
            continue;
        } 
        if (name === '-cp' || name === '-p' || name === '--class-path') {
            i++;
            classpath.push(path.resolve(hxmlOptions[i]));
            continue;
        }
    }
    if (options.server) {
        args.push(`--connect ${options.server}`);
    }
    if (options.debug) {
        args.push('-debug');
    }
    return { jsOutputFiles, classpath, args };
}
