"use strict";

let test = require('tape');
let G = require('../index').GRunner;

test('env', function(t) {
    let g = new G({log: msg => { } });

    process.env['K1'] = 'V1';
    process.env['K2'] = 'V2';
    process.env['K3'] = 'V3[[K2]][[NON_EXISTING]]';
    process.env['K4'] = 'V4[[K3]][[K1]]V4';

    t.is(g.env('K4'), 'V4V3V2V1V4');
    t.is(g.env('NON_EXISTING'), '');
    t.end();
});

test('env loop', function(t) {
    let g = new G({log: msg => { } });

    process.env['K1'] = 'V1[[K2]]';
    process.env['K2'] = 'V2[[K1]]';

    t.throws(() => {
        g.env('K2');
    }, /RangeError/);
    t.end();
});

test.skip('max life', function(t) {
    let g = new G({log: msg => { } });
    t.plan(2);

    let f = setTimeout;
    setTimeout = function(fn, interval) {
        t.is(interval, 10 * 60 * 1000);
        return f(fn, 0);
    };

    g.setProcessMaxLifeTime(10, () => {
        setTimeout = f;
        t.pass();
        t.end();
    });

});
