"use strict";

let test = require('tape');
let G = require('../lib/GRunner').GRunner;

test('add task', function(t) {
    let g = new G({log: msg => { } });
    t.isNotEqual(g.tasks, null);
    g.t('t1');
    t.not(g.tasks['t1'], null, 'task');
    t.is(g.tasks['t1'].cb, null, 'cb');
    t.not(g.tasks['t1'].dep, null, 'dep');
    t.end();
});

test('add task with body', function(t) {
    let g = new G({log: msg => { } });
    t.isNotEqual(g.tasks, null);
    g.t('t1', (cb) => { cb(); });
    t.not(g.tasks['t1'], null, 'task');
    t.not(g.tasks['t1'].cb, null, 'cb');
    t.is(g.tasks['t1'].dep.length, 0, 'dep');
    t.end();
});

test('add task with dep', function(t) {
    let g = new G({log: msg => { } });
    t.isNotEqual(g.tasks, null);
    g.t('t1', 't0');
    t.not(g.tasks['t1'], null, 'task');
    t.is(g.tasks['t1'].cb, null, 'cb');
    t.is(g.tasks['t1'].dep.length, 1, 'dep');
    t.end();
});

test('order', function(t) {
    let g = new G({ verbose: true });

    let runTasks = [];

    let tf = (cb, info) => {
        runTasks.push(info.taskName);
        cb();
    };

    for(let i = 1; i < 9; i++) {
        let td = (i > 1) ? [ 't' + (i - 1) ] : [];
        g.t('t' + i, td, tf);
    }

    g.t('tt', ['t1', 't2', ['t3', 't4'] ], tf);

    g.run('tt', () => {
        t.same(runTasks, ['t1', 't1', 't2', 't1', 't1', 't2', 't2', 't3', 't3', 't4', 'tt']);
        t.end();
    });

});

test('order2', function(t) {
    let g = new G({verbose: true});

    let runTasks = [];

    let tf = (cb, info) => {
        setTimeout(() => {
            runTasks.push(info.taskName);
            cb();
        }, 100);
    };

    for(let i = 1; i < 9; i++) {
        //let td = (i > 1) ? [ 't' + (i - 1) ] : [];
        //g.t('t' + i, td, tf);
        g.t('t' + i, tf);
    }

    g.t('t2', ['t5', 't6', 't7', 't8']);

    g.t('tt', [['t1', 't2', 't3', 't4']], tf);

    g.run('tt', (err) => {
        console.log(runTasks);
        t.end();
    });

});