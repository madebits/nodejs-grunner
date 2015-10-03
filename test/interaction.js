"use strict";

let test = require('tape');
let G = require('../index').GRunner;
let gulp = require('gulp');
let through = require('through2');
let gspawn = require('gspawn');

test('promise', function(t) {

    let g = new G({log: msg => { } });

    g.t('t1', () => {
        return new Promise((s, f) => {
            setTimeout(s, 100);
        });
    });

    g.options.afterTaskRun = () => {
        t.pass();
        t.end();
    };

    g.run('t1');

});

test('gulp', function(t){
    let g = new G({log: msg => { } });
    g.t('t1', () => {
        return gulp.src('./test/interaction.js')
            .pipe(through.obj((o, e, cb) => {
                t.ok(o.path.endsWith('interaction.js'));
            cb();
        }));
    });

    g.options.afterTaskRun = () => {
        t.pass();
        t.end();
    };

    g.run('t1');

});


test('gulp handle', function(t){
    let g = new G({log: msg => { } });
    g.t('t1', cb => {
        let s = gulp.src('./test/interaction.js')
            .pipe(through.obj((o, e, _cb) => {
                t.ok(o.path.endsWith('interaction.js'));
                _cb();
            }));
        cb.onDone(s, () => cb());
    });

    g.options.afterTaskRun = () => {
        t.pass();
        t.end();
    };

    g.run('t1');

});

test('gulp handle null', function(t){
    let g = new G({log: msg => { } });
    g.t('t1', function(cb) {
        cb.onDone();
    });

    g.options.afterTaskRun = () => {
        t.pass('after');
    };

    g.run('t1', err => t.end(err));

});

test('tool', function(t){
    let g = new G({log: msg => { } });
    g.t('t1', function(cb) {
        gspawn({
            cmd: 'bash',
            args: ['-c', 'ls -l'],
            resolveCmd: true,
            collectStdout: true,
            logCall: true
        }, cb);
    });

    g.run('t1', err => t.end(err));

});

test('external task', function(t){

    let externalTask = (filePath) => {
        return cb => {
            gspawn({
                cmd: 'node',
                args: filePath,
                resolveCmd: true,
                logCall: true
            }, cb);
        };
    };

    let g = new G({log: msg => { } });
    g.t('t1', externalTask('./test/test.js') );

    g.run('t1', err => t.end(err));

});