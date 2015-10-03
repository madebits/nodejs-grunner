"use strict";

let test = require('tape');
let G = require('../index').GRunner;

class Helper {

    constructor(t, canLog) {
        this.t = t;
        this.calls = [];
        this.g = new G({ log: msg => { if(canLog) console.log(msg); } });

    }

    init(ttDep) {
        let tf = this.tf.bind(this);
        [...Array(20).keys()].forEach(i => this.g.t('t' + (i + 1), tf));
        this.g.t('tt', ttDep, tf);
    }

    verifyPO(order) {
        let previous = -1;
        return order.map(o => {
            var idx = this.calls.indexOf(o);
            if (idx < 0) throw new Error(o);
            return idx;
        }).every(s => {
            let t = previous;
            previous = s;
            return s > t;
        });
    }

    tf(cb) {
        setTimeout(() =>{
            this.calls.push(cb.ctx.taskName);
            cb();
        }, Math.floor((Math.random() * 50) + 1));
    }

    run(orders) {
        this.g.run('tt', err => {
            console.log(this.calls.toString());
            orders.forEach(o => {
                this.t.true(this.verifyPO(o), o.toString());
            });
            this.t.end(err);
        });
    }

}

test('po.seq', function(t) {
    let h = new Helper(t);
    h.init(['t1', 't2', 't3', 't4', 't5']);
    h.run([['t1', 't2', 't3', 't4', 't5', 'tt']]);
});

test('po.par', function(t) {
    let h = new Helper(t);
    h.init(['t1', ['t2', 't3', 't4'], 't5']);
    h.run([
        ['t1', 't2', 't5', 'tt']
        , ['t1', 't3', 't5', 'tt']
        , ['t1', 't4', 't5', 'tt']
    ]);
});

test('po.mix', function(t) {
    let h = new Helper(t);
    h.init([ 't1', ['t2', 't3', ['t4', 't5', ['t6', 't7'], 't8'], 't9'], 't10']);
    h.run([
        ['t1', 't2', 't10', 'tt']
        , ['t1', 't9', 't10', 'tt']
        , ['t1', 't4', 't5', 't7', 't8', 't10', 'tt']
    ]);
});



