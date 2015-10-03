#!/usr/bin/env node

"use strict";

let G = require('./../lib/GRunner')
    , argv = require('yargs').usage('Usage: $0 [--gdir dir] [--gdirrec dir] [--gfile path] [--gtask taskName] [--T] [--D]').argv
    , path = require('path')
    , rd = require('require-dir')
    ;

let dirName = G._toArray(argv.gdir);
let dirNameRec = G._toArray(argv.gdirrec);
let fileName = G._toArray(argv.gfile || './gfile.js');
let taskName = G._toArray(argv.gtask || 'default');

dirNameRec.forEach(f => {
    let p = path.resolve(f);
    console.log(`Dir:  ${p}`);
    rd(path.resolve(p), { recurse: true });
});

dirName.forEach(f => {
    let p = path.resolve(f);
    console.log(`Dir:  ${p}`);
    rd(path.resolve(p), { recurse: false });
});

fileName.forEach(f => {
    let p = path.resolve(f);
    console.log(`File: ${p}`);
    require(path.resolve(f));
});

if(argv.T) {
    G.dumpTasks();
    process.exit(0);
}

if(argv.D) {
    G.options.dryRun = true;
}

taskName.forEach(t => {
    G.run(taskName, err => {
        if(err) process.exit(1);
        else process.exit(0);
    });
});
