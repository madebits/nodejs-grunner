"use strict";
let G = require('../index');

G.t('t1', (cb) => {
    console.log('test');
    console.log('test');
    console.log('test');
    console.log('test');
    cb();
});
G.t('t2', ['t1']);
G.t('t3', () => {
    console.log('test');
    throw new Error("aaa");
});
G.t('default', 't2');

for(let i = 0; i < 20; i++) G.t('a' + i);

G.t('aa', [ 'a1', ['a2', 'a3', ['a4', 'a5', ['a6', 'a7'], 'a8'], 'a9'], 'a10']);

