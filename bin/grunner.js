#!/usr/bin/env node

'use strict';

const __ = require('async')
    , G = require('./../index')
    , fs = require('fs')
    , path = require('path')
    , rd = require('require-dir')
    , argv = require('yargs').usage('Usage: $0 [--gfile fileOrDir] [--gtask taskName] [--T] [--D] [--P] [--C] [--L timeMin] [--env.KEY="VALUE"]').argv
    , gv = require('../package.json').version
    , GUtils = require('../lib/gutils')
    ;

G.log(`# NodeJs: ${process.version}, GRunner: ${gv}`);

if(argv.env) {
    Object.keys(argv.env).forEach(e => {
        const info = process.env[e] ? ' (overwritten)' : '';
        G.log(`# Environment: ${e}=${argv.env[e]}${info}`);
        process.env[e] = argv.env[e];
    });
}

G.options.dryRun = !!argv.D;
G.options.noLoopDetection = !!argv.C;
if(argv.L) G.setProcessMaxLifeTime(argv.L);

const paths = GUtils.toArray(argv.gfile || './gfile.js')
    , taskName = GUtils.toArray(argv.gtask || 'default')
    ;

paths.forEach(f => {
    const p = path.resolve(f);
    try {
        const stat = fs.lstatSync(p);
        if(stat.isDirectory()) {
            G.log(`# Dir: ${p}`);
            rd(p, { recurse: true });
        }
        else if(stat.isFile()) {
            G.log(`# File: ${p}`);
            require(p);
        }
        else throw new Error('Not a valid file or folder: ' + f);
    } catch(e) {
        G.log(e);
        process.exit(1);
    }
});

const ts = taskName.map(t => (__cb) => {
    G.log(`# Task: ${argv.P ? '| ' : ''}${t}`);
    G.run(t, __cb);
});

if(argv.T) {
    G.dumpTasks();
    process.exit(0);
}

const done = err => {
    if(err) process.exit(1);
    G.log('# Done');
};

if(argv.P) { __.parallel(ts, done); }
else { __.series(ts, done); }
