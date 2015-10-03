"use strict";

let test = require('tape');
let G = require('../lib/GRunner').GRunner;
let gulp = require('gulp');
let throught = require('through2');

test('promise', function(t) {

    let g = new G({log: msg => { } });

    g.t('t1', function() {
        return new Promise(function(s, f) {
            setTimeout(s, 100);
        });
    });

    g.options.afterTaskRun = function() {
        t.pass();
        t.end();
    };

    g.run('t1');

});

test('gulp', function(t){
    let g = new G({log: msg => { } });
    g.t('t1', function() {
        return gulp.src('./test/interaction.js')
            .pipe(throught.obj((o, e, cb) => {
                t.ok(o.path.endsWith('interaction.js'));
            cb();
        }));
    });

    g.options.afterTaskRun = function() {
        t.pass();
        t.end();
    };

    g.run('t1');

});


test('gulp handle', function(t){
    let g = new G({log: msg => { } });
    g.t('t1', function(cb, ctx) {
        let s = gulp.src('./test/interaction.js')
            .pipe(throught.obj((o, e, _cb) => {
                t.ok(o.path.endsWith('interaction.js'));
                _cb();
            }));
        ctx.onDone(s, cb);
    });

    g.options.afterTaskRun = function() {
        t.pass();
        t.end();
    };

    g.run('t1');

});

