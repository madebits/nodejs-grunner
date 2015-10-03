#!/usr/bin/env node

"use strict";

let __ = require('async')
    , G = require('./../lib/GRunner')
    , fs = require('fs')
    , path = require('path')
    , rd = require('require-dir')
    , argv = require('yargs').usage('Usage: $0 [--gfile fileOrDir] [--gtask taskName] [--T] [--D] [--P] [--C]').argv
    ;

G.options.dryRun = !!argv.D;
G.options.noLoopDetection = !!argv.C;

let paths = G._toArray(argv.gfile || './gfile.js')
    , taskName = G._toArray(argv.gtask || 'default')
    ;

paths.forEach(f => {
    let p = path.resolve(f);
    let stat = fs.lstatSync(p);
    if(stat.isDirectory()) {
        console.log(`Dir: ${p}`);
        rd(p, { recurse: true });
    }
    else if(stat.isFile()) {
        console.log(`File: ${p}`);
        require(p);
    }
});

let ts = taskName.map(t => (__cb) => {
    console.log(`Task: ${argv.P ? '| ' : ''}${t}`);
    G.run(t, err => { __cb(err); });
});

if(argv.T) {
    G.dumpTasks();
    process.exit(0);
}

let done = err => {
    if(err) process.exit(1);
    else process.exit(0);
};

if(argv.P) { __.parallel(ts, done); }
else { __.series(ts, done); }
