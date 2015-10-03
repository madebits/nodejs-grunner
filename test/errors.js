"use strict";

let test = require('tape');
let G = require('../lib/GRunner').GRunner;
let gulp = require('gulp');
let throught = require('through2');

test('error returned in cb', function(t) {

    let g = new G({ });

    g.t('t1', function(cb) {
        cb(new Error('qwerty-cb'));
        cb();
    });
    g.t('t2', function(cb) { cb(); });
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty-cb');
        t.end();
    });

});

test('error thrown', function(t) {

    let g = new G({ log: msg => { } });

    g.t('t1', function(cb) {
        throw new Error('qwerty');
    });
    g.t('t2', function(cb) { cb(); });
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty');
        t.end();
    });

});

test('error asyncn', function(t) {

    let g = new G({ log: msg => { } });

    g.t('t1', function(cb) {
        setTimeout(() => {
            // throw new Error('qwerty'); // wrong, node cannot handle this
            // right
            try {
                throw new Error('qwerty');
            }catch(e) {
                cb(e);
                return;
            }
        }, 100);

    });
    g.t('t2', function(cb) { cb(); });
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty');
        t.end();
    });

});

test('error in promise', function(t) {

    let g = new G({ log: msg => { } });

    g.t('t1', function() {
        return new Promise(function(s, f) {
            throw new Error('qwerty');
        });
    });
    g.t('t2', function(cb) { cb(); });
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty');
        t.end();
    });

});

test('error in pipe', function(t) {

    let g = new G({ log: msg => { } });

    g.t('t1', function() {
        return gulp.src('./test/interaction.js')
            .pipe(throught.obj((o, e, cb) => {
                cb(new Error('qwerty'));
            }));
    });
    g.t('t2', function(cb) { cb(); });
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty');
        t.end();
    });

});

test('dependency cycle', function(t) {
    let g = new G({ log: msg => { } });
    g.t('t1', ['t2']);
    g.t('t2', ['t1']);
    g.t('tt', ['t2']);
    g.run('tt', err => {
        t.true(err instanceof RangeError);
        t.end();
    });
});
