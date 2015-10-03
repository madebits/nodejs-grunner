"use strict";

require('require-dir')('./');
//require('./wf.js');

let t = require('tape');

//t.only('through pipe');

t.onFinish(function () {
    if(t.getHarness()._results.fail) {
        setImmediate(() => { console.error('\n' + ':o( !!! '.repeat(10)) });
    }
});