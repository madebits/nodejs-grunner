"use strict";

let test = require('tape');
let G = require('../lib/GRunner').GRunner;

test('wf.seq1', function(t) {
    let g = new G({ log: msg => { } }); //log: msg => { }
    let count = 0;

    [...Array(5).keys()].forEach(i => {
        g.t('t' + (i+1), cb => { t.is(count++, i); cb(); });
    });

    g.t('tt', ['t1', 't2', 't3', 't4', 't5'], cb => { t.is(count, 5); cb(); });
    g.run('tt', t.end);
});

test('wf.seq2', function(t) {
    let g = new G({ log: msg => { } }); //log: msg => { }
    let count = 0;

    let tf = (cb, delay, expected) => {
        setTimeout(()=> {
            t.is(count++, expected, cb.ctx.taskName);
            cb();
        }, delay);
    };

    [...Array(5).keys()].forEach(i => {
        g.t('t' + (i+1), cb => { tf(cb, 100 * (5 - i), i); });
    });

    g.t('tt', ['t1', 't2', 't3', 't4', 't5'], cb => { t.is(count, 5); cb(); });
    g.run('tt', t.end);
});

test('wf.par1', function(t) {
    let g = new G({ log: msg => { } });
    let count = 0;
    let tf = (cb, delay, expected) => {
        setTimeout(()=> {
            t.is(count++, expected, cb.ctx.taskName);
            cb();
        }, delay);
    };

    [...Array(5).keys()].forEach(i => {
        g.t('t' + (i+1), cb => { tf(cb, 100 * (i+1), i + 1); });
    });

    g.t('t0', cb => { tf(cb, 600, 0); });
    g.t('t6', cb => { t.is(count++, 6, 't6'); cb(); });

    g.t('tt', ['t0', ['t1', 't2', 't3', 't4', 't5'], 't6'], cb => { t.is(count, 7); cb(); });
    g.run('tt', t.end);
});

test('wf.par2', function(t) {
    let g = new G({ log: msg => { } });
    let count = 0;
    let tf = (cb, delay, expected) => {
        setTimeout(()=> {
            t.is(count++, expected, cb.ctx.taskName);
            cb();
        }, delay);
    };

    [...Array(5).keys()].forEach(i => {
        g.t('t' + (i+1), cb => { tf(cb, 100 * (5 - i), 4 - i); });
    });

    g.t('tt', [['t1', 't2', 't3', 't4', 't5']], cb => { t.is(count, 5); cb(); });
    g.run('tt', t.end);
});

