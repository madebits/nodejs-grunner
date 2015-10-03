"use strict";

let test = require('tape');
let G = require('../index').GRunner;
let through = require('through2');

test('files', t => {
    t.plan(3);
    let g = new G({ });
    let files = [];
    g.files('./test/files', false).pipe(g.pipeThrough((f, cb) => {
        files.push(f);
        cb();
    }, cb => {
        t.ok(files[0].file.endsWith('a.js'));
        t.ok(files[1].file.endsWith('a.txt'));
        t.ok(files[2].file.endsWith('b.txt'));
        t.end();
        cb();
    }));
});

test('files rec', t => {
    t.plan(3);
    let g = new G({ });

    let files = [];
    g.files('./test/files', true).pipe(g.pipeThrough((f, cb) => {
        files.push(f.name);
        cb();
    }, cb => {
        t.ok(files.indexOf('a.js') >= 0);
        t.ok(files.indexOf('d11.txt') >= 0);
        t.ok(files.indexOf('d21.txt') >= 0);
        t.end();
        cb();
    }));
});

test('files filter', t => {
    t.plan(3);
    let g = new G({ });

    let files = [];
    g.files('./test/files', true, file => {
        return (file.file.toLowerCase().endsWith('.js'));
    }).pipe(g.pipeThrough((f, cb) => {
        files.push(f.name);
        cb();
    }, cb => {
        t.ok(files.indexOf('a.js') >= 0);
        t.ok(files.indexOf('d21.js') >= 0);
        t.ok(files.indexOf('a.txt') < 0);
        t.end();
        cb();
    }));
});

test('files null', t => {
    t.plan(1);
    let g = new G({ });

    g.files('', true).pipe(g.pipeThrough((f, cb) => {
        files.push(f.name);
        cb();
    }, cb => {
        t.pass();
        t.end();
        cb();
    }));
});

test('files wrong', t => {
    t.plan(2);
    let g = new G({ });

    g.files('asdsafasfafa', true).on('error', err => {
       t.pass();
    }).pipe(g.pipeThrough((f, cb) => {
        files.push(f.name);
        cb();
    }, cb => {
        t.pass();
        t.end();
        cb();
    }));
});

test('file read', t => {
    let g = new G({ });
    let d = g.fileReadBin('./test/aaaaaaa.txt');
    t.is(d, null);
    d = g.fileReadBin('./test/files/a.txt');
    t.is(d.toString('utf8'), 'ABC');
    d = g.fileReadTxt('./test/files/a.txt');
    t.is(d, 'ABC');
    d = g.fileReadJson('./test/files/a.js', true);
    t.is(d.a, 'ABC');
    t.end();
});

test('file write', t => {
    let g = new G({ });

    g.fileWriteJson('./test/temp/a.js', {a: 5, b: 'ABC'});
    let d = g.fileReadJson('./test/temp/a.js', true);
    t.is(d.a, 5);

    g.rm('./test/temp');

    t.end();
});