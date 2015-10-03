"use strict";

require('require-dir')('./');
//require('./wf.js');

let t = require('tape');

t.onFinish(function () {
    if(t.getHarness()._results.fail) {
        setImmediate(() => { console.error('\n' + ':o( !!! '.repeat(10)) });
    }
});