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

    let g = new G();

    let externalTask = filePath => {
        return cb => {
            gspawn({
                cmd: 'node',
                args: filePath,
                resolveCmd: true,
                logCall: true,
                log: (data, source) => g.log(data, !(source % 2), cb.ctx.taskName),
            }, cb);
        };
    };

    g.t('t1', externalTask('./test/test.js') );

    g.run('t1', err => t.end(err));

});

test('start pipe', function(t) {

    let g = new G({log: msg => { } });
    t.plan(3);

    let sequence = function* () {
        yield 'a';
        yield 'b';
        yield 'c';
    };

    let res = [];

    g.t('tt', cb => {
        return g.startPipe(sequence()).pipe(through.obj((o, e, _cb) => {
            res.push(o);
            _cb();
        }));
    });

    g.run('tt', err => {
        t.is(res[0], 'a');
        t.is(res[1], 'b');
        t.is(res[2], 'c');
        t.end(err);
    });
});

test('start pipe null', function(t) {

    let g = new G({log: msg => { } });
    t.plan(1);

    let res = [];

    g.t('tt', cb => {
        return g.startPipe().pipe(through.obj((o, e, _cb) => {
            res.push(o);
            _cb();
        }));
    });

    g.run('tt', err => {
        t.is(res.length, 0);
        t.end(err);
    });
});

test('through pipe', function(t) {

    let g = new G({log: msg => { } });


    let sequence = function* () {
        yield 'a';
        yield 'b';
        yield 'c';
    };

    let res = [];
    let res2 = [];

    g.t('tt', cb => {
        return g.startPipe(sequence()).pipe(g.throughPipe((o, cbFn) => {
            res.push(o);
            console.log(o);
            cbFn.push(res.length);
            cbFn(null, res.length);
        }, cbFn => {
            cbFn.push('abc');
            cbFn();
        })).pipe(through.obj((o, e, _cb) => {
            res2.push(o);
            console.log(o);
            _cb();
        }));;
    });

    g.run('tt', err => {
        t.is(res[0], 'a');
        t.is(res[1], 'b');
        t.is(res[2], 'c');

        t.is(res2[0], 1, '1');
        t.is(res2[1], 1, '1');
        t.is(res2[2], 2, '2');
        t.is(res2[3], 2, '2');
        t.is(res2[4], 3, '3');
        t.is(res2[5], 3, '3');
        t.is(res2[6], 'abc');

        t.end(err);
    });
});