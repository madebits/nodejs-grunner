"use strict";

require('require-dir')('./');

var t = require('tape');
t.onFinish(function () {
    if(t.getHarness()._results.fail) {
        setImmediate(() => {console.error('\n' + Array(11).join(':o( !!! ')) });
    }
});