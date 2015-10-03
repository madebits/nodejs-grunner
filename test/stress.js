"use strict";

let test = require('tape');
let G = require('../lib/GRunner').GRunner;

test('stress', function(t) {
    let g = new G({ log: () => {} });

    let count = 0;

    let tf = (cb) => {
        count++;
        cb();
    };

    const max = 10000;

    for(let i = 1; i <= max; i++) {
        let td = (i > 1) ? [ 't' + (i - 1) ] : [];
        g.t('t' + i, td, tf);
    }

    g.t('tt', ['t' + max]);

    g.run('tt', (err) => {
        t.is(count, max, 'count ' + max);
        t.end(err);
    });

});
