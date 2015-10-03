"use strict";

var G = require('./lib/GRunner');

var g = new G.GRunner();

g.t('t1', () => {});
g.t('t2', ['t1', ['t1']]);
g.t('t0');
g.dumpTasks();


