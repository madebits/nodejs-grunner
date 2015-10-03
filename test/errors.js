"use strict";

let test = require('tape');
let G = require('../index').GRunner;
let gulp = require('gulp');
let through = require('through2');

test('error returned in cb', function(t) {

    let g = new G({ });

    g.t('t1', cb => {
        cb(new Error('qwerty-cb'));
    });
    g.t('t2', cb => cb());
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty-cb');
        t.end();
    });

});

test('error thrown', function(t) {

    let g = new G({ log: msg => { } });

    g.t('t1', cb => {
        throw new Error('qwerty');
    });
    g.t('t2', cb => cb());
    g.t('tt', ['t1', 't2']);

    g.run('tt', err => {
        t.same(err.message, 'qwerty');
        t.end();
    });

});

test('error async', function(t) {

    let g = new G({ log: msg => { } });

    g.t('t1', cb => {
        setTimeout(() => {
            // throw new Error('qwerty'); // wrong, node cannot handle this
            // right:
            try {
                throw new Error('qwerty');
            }catch(e) {
                cb(e);
            }
        }, 100);

    });
    g.t('t2', cb => cb());
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
    g.t('t2', cb => cb());
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
            .pipe(through.obj((o, e, cb) => {
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
    let g = new G({  }); //log: msg => { }
    g.t('t1', ['t2']);
    g.t('t2', ['t3']);
    g.t('t3', ['t1']);
    g.t('tt', ['t2']);
    g.run('tt', err => {
        t.isNot(err, null, err.message);
        t.end();
    });
});

test('log', function(t) {
    let util = require('util');

    let g = new G();
    g.options.name = 'G';

    g.log('a\n\nbbd\n', null, 't1'); // trim last \n
    g.log('a\nb\n\n', null, 't2');
    try {
        let t = a[4];
    }
    catch(e) {
        g.log(e);
    }
    t.end();
});