"use strict";
let G = require('../lib/GRunner');

G.t('t1');
G.t('t2', ['t1']);
G.t('t3', () => { throw new Error("aaa"); });
G.t('default', 't2');

