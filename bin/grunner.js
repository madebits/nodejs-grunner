#!/usr/bin/env node

"use strict";

let G = require('./../lib/GRunner')
    , argv = require('yargs').usage('Usage: $0 [--gdir dir] [--gdirrec dir] [--gfile path] [--gtask taskName] [--T] [--D] [--P] [--C]').argv
    , path = require('path')
    , rd = require('require-dir')
    , __ = require('async')
    ;

let dirName = G._toArray(argv.gdir)
    , dirNameRec = G._toArray(argv.gdirrec)
    , fileName = G._toArray(argv.gfile || './gfile.js')
    , taskName = G._toArray(argv.gtask || 'default')
    ;

dirNameRec.forEach(f => {
    let p = path.resolve(f);
    console.log(`DirR:  ${p}`);
    rd(p, { recurse: true });
});

dirName.forEach(f => {
    let p = path.resolve(f);
    console.log(`Dir:  ${p}`);
    rd(p, { recurse: false });
});

fileName.forEach(f => {
    let p = path.resolve(f);
    console.log(`File: ${p}`);
    require(p);
});

if(argv.T) {
    G.dumpTasks();
    process.exit(0);
}

if(argv.D) {
    G.options.dryRun = true;
}

if(argv.C) {
    G.options.noLoopDetection = true;
}

let ts = taskName.map(t => (__cb) => {
    console.log(`Task: ${argv.P ? '| ' : ''}${t}`);
    G.run(t, err => { __cb(err); });
});

let done = err => {
    if(err) process.exit(1);
    else process.exit(0);
};

if(argv.P) { __.parallel(ts, done); }
else { __.series(ts, done); }
