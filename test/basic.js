"use strict";

const test = require('tape');
const G = require('../index').GRunner;

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
    g.t('t1', cb => cb());
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

test('user data', function(t) {
    let g = new G({log: msg => { } });
    g.t('t1', (cb) => {
        t.is(cb.ctx.task.userData.a, 5);
        cb.ctx.task.userData.a = 10;
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
        exec: doneCb => {
            doneCb.ctx.task.userData = 'abc';
            t.pass('called exec');
            doneCb.ctx.task.cb(doneCb);
        },
        beforeTaskRun: ctx => {
            t.pass('before');
        },
        afterTaskRun: ctx => {
            t.pass('after');
            ctx.task.userData ='aaa';
        }
    });
    g.t('t1', cb => {
        t.is(cb.ctx.task.userData, 'abc', 'user data');
        t.isNot(cb.onDone, null, 'onDone present');
        t.isNot(cb.ctx.task, null, 'task present');
        t.is(cb.ctx.taskName, 't1', 'task name');
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
    g.t('t1', cb => {
        t.pass('called');
        g.tasks.t2.dep = [];
        cb();
    });
    g.t('t2', ['t1']);
    g.t('t3', ['t2']);
    g.t('tt', ['t1', 't2', 't3']);
    g.run('tt', t.end);
});

test('dynamic task', t => {
    let g = new G({ log: () => {} }); //
    t.plan(1);
    g.t('t1', cb => {
        t.pass('called');
        g.t('t4', ['t5']);
        g.t('t5', cb => cb());
        g.tasks.t2.dep = ['t4'];
        cb();
    });
    g.t('t2', ['t1']);
    g.t('t3', ['t2']);
    g.t('tt', ['t1', 't2', 't3']);
    g.run('tt', t.end);
});


test('null dep', t => {
    let F = false;
    t.plan(1);
    let g = new G({});
    g.t('t1');
    g.t('t2', [null, 't1', '']);
    g.t('t3', [ [null, null], 't2', null, 't1', F ? 'aaa' : null]);
    g.run('t3', () => {
        t.pass();
        t.end();
    });
});


test('run', t => {
    let g = new G({ log: () => {} }); //
    t.plan(1);
    g.t('t1', cb => {
        t.pass('called');
    });
    g.t('t2');
    g.t('t3', 't2', cb => {
        g.run('t1', cb);
    });
    g.t('tt', ['t1', 't2', 't3']);
    g.run('tt', t.end);
});

test('run once', t => {

    const once = ucb => {
        return cb => {
            if(!cb.ctx.task.once) {
                cb.ctx.task.once = true;
                cb.ctx.runner.log('@once', false, cb.ctx.taskName);
                return ucb(cb);
            }
            cb();
        };
    };

    const g = new G(); //{ log: () => {} }); //
    t.plan(1);
    g.t('t0');
    g.t('t1', 't0', once(cb => {
        t.pass('called');
        cb();
    }));
    g.t('t2', 't1');
    g.t('t3', 't2');
    g.t('tt', ['t3', 't2', 't1']);
    g.run('tt', t.end);
});