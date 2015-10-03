"use strict";
let G = require('../lib/GRunner');

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

