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

    g.run('tt', () => {
        console.log(runTasks);
        t.end();
    });

});

test('user data', function(t) {
    let g = new G({log: msg => { } });
    g.t('t1', (cb, ctx) => {
        t.is(ctx.task.userData.a, 5);
        ctx.task.userData.a = 10;
        cb();
    }, { a: 5 });
    g.run('t1', () => {
        t.is(g.tasks['t1'].userData.a, 10);
        t.end();
    });
});

test('t.overload', function(t) {
    let g = new G({log: msg => { } });
    g.t('t1');
    t.isNot(g.tasks['t1'], null);
    t.is(g.tasks['t1'].cb, null);
    t.is(g.tasks['t1'].dep.length, 0);
    t.is(g.tasks['t1'].userData, null);

    let td = [ 't3' ];
    let tf = () => {};
    let tu = 'abc';

    g.t('t2', tf);
    t.isNot(g.tasks['t2'], null);
    t.is(g.tasks['t2'].cb, tf);
    t.is(g.tasks['t2'].dep.length, 0);
    t.is(g.tasks['t2'].userData, null);

    g.t('t3', tf, tu);
    t.isNot(g.tasks['t3'], null);
    t.is(g.tasks['t3'].cb, tf);
    t.is(g.tasks['t3'].dep.length, 0);
    t.is(g.tasks['t3'].userData, tu);

    g.t('t4', td, tf, tu);
    t.isNot(g.tasks['t4'], null);
    t.is(g.tasks['t4'].cb, tf);
    t.is(g.tasks['t4'].dep, td);
    t.is(g.tasks['t4'].userData, tu);

    g.t('t5', td, tf);
    t.isNot(g.tasks['t5'], null);
    t.is(g.tasks['t5'].cb, tf);
    t.is(g.tasks['t5'].dep, td);
    t.is(g.tasks['t5'].userData, null);

    t.end();
});

test('exec', function(t) {
    let g = new G({log: msg => { },
        exec: (doneCb, ctx) => {
            ctx.task.userData = 'abc';
            t.pass('called exec');
            ctx.task.cb(doneCb, ctx);
        },
        beforeTaskRun: (ctx) => {
            t.is(ctx.onDone, undefined, 'before');
        },
        afterTaskRun: (ctx) => {
            t.is(ctx.onDone, null, 'after');
            ctx.task.userData ='aaa';
        }
    });
    g.t('t1', (cb, ctx) => {
        t.is(ctx.task.userData, 'abc', 'user data');
        t.isNot(ctx.onDone, null, 'onDone present');
        t.isNot(ctx.task, null, 'task present');
        t.is(ctx.taskName, 't1', 'task name');
        cb();
    }, { a: 5 });
    g.run('t1', () => {
        t.is(g.tasks['t1'].userData, 'aaa', 'done user data');
        t.end();
    });
});

test('dynamic dep', function(t) {
    let g = new G({ log: () =>{} });
    t.plan(1);
    g.t('t1', (cb) => {
        t.pass('called');
        g.tasks.t2.dep = [];
        cb();
    });
    g.t('t2', ['t1']);
    g.t('t3', ['t2']);
    g.t('tt', ['t1', 't2', 't3']);
    g.run('tt', (err) => { t.end(err); });
});