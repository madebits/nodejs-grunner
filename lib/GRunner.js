"use strict";

let __ = require('async')
    , Stream = require('stream').Stream
    , throught = require('through2')
    ;

class GRunner {

    constructor(options) {
        this.options = options || {};
        this.tasks = {};
    }

    _cloneInfo(info) {
        if(!info) return { depth: 0, type: '' };
        return Object.assign({}, info);
    }

    _incInfo (info, type) {
        info = this._cloneInfo(info);
        info.depth++;
        info.type += type;
        return info;
    }

    _toArray(o) {
        if(!o) return [];
        if(!Array.isArray(o)) {
            o = [ o ];
        }
        return o;
    }

    _depMap(dependencies, info) {
        let _this = this;
        let serFun = [];
        dependencies = _this._toArray(dependencies);
        if(!dependencies.length) {
            return serFun;
        }
        info = _this._incInfo(info, 's');
        let depFun = dependencies.map(d => {
            if(Array.isArray(d)) {
                return (__cb) => {
                    let f = d.map(pd => {
                        return (__cb) => {
                            if(Array.isArray(pd)) {
                                let nestedSerFun = _this._depMap(pd, info);
                                __.series(nestedSerFun, __cb);
                                return;
                            }
                            _this._runner(pd, __cb, _this._incInfo(info, 'p'));
                        };
                    });
                    __.parallel(f, __cb);
                };
            }
            return (__cb) => {
                _this._runner(d, __cb, info);
            };
        });
        serFun.push(...depFun);
        return serFun;
    }

    _runner(taskName, cb, info) {
        var _this = this;
        if(!taskName) throw new Error('taskName required');
        if(!cb) throw new Error('cb required');
        let task = _this.tasks[taskName];
        if(!task) throw new Error('Undefined task: ' + taskName);
        _this.log(`Run: ${taskName}`);
        info = _this._cloneInfo(info);
        let serFun = _this._depMap(task.dep, info);
        serFun.push(__cb => {
            _this._exec(taskName, task, __cb, info);
        });
        __.series(serFun, cb);
    }

    run(taskName, cb) {
        if(!this.options) this.options = {};
        if(!this.tasks) this.tasks = {};
        if(!taskName) taskName = 'default';
        this.log(`Start${this.options.dryRun ? ' [!DryRun!]' : ''} [${taskName}]`);
        let doneCb = err => {
            let msg = `End [${err ? 'Failed' : 'Success'}]`;
            if(err) msg += `\nFailed: ${err}`;
            this.log(msg);
            if (cb) cb(err);
        };
        try {
            this._runner(taskName, doneCb, null);
        } catch(e) {
            doneCb(e);
        }
    }

    _exec(taskName, task, cb, _info) {
        let _this = this;
        let info = Object.assign(_this._cloneInfo(_info), { taskName, runner: _this, task });
        const pad = Array(info.depth + 1).join('.');
        const parallel = info.type.endsWith('p') ? '|' : '';
        this.log(`+ ${pad}${parallel} ${taskName}${_this.options.verbose ? ' ' + info.type : ''}`);

        let doneCb = (function (){
            let doneCbCalled = false;
            return (err) => {
                if(doneCbCalled) return;
                doneCbCalled = true;
                if(err) _this.log(err, true);
                process.nextTick(() => { cb(err); });
                if(_this.options.afterTaskRun) _this.options.afterTaskRun(info);
                _this.log(`- ${pad} ${taskName}`);
            };
        })();

        let taskFun = (task.cb && !_this.options.dryRun) ? task.cb : cb => { cb(); };
        if(_this.options.beforeTaskRun) _this.options.beforeTaskRun(info);

        let res = null;
        try {
            res = _this.options.exec
                ? _this.options.exec(doneCb, info)
                : taskFun(doneCb, info);
        } catch(e) {
            doneCb(e);
            return;
        }
        if(!res) return;

        if(typeof res.then === 'function') {
            res.then(
                () => { doneCb(); },
                (err) => { doneCb(err || new Error(`Failed ${taskName}`)); });
        }
        else if((res instanceof Stream) && (typeof res.pipe === 'function')) {
            res.on('error', err => {
                doneCb(err);
                res.end();
            });
            let onPipeEnd = throught.obj((file, enc, cb) => { cb(); }, cb => {
                doneCb(); cb();
            } );
            res.pipe(onPipeEnd);
        }
        else throw new Error('Unsupported task return type!');
    }

    log(msg, isErr) {
        if(this.options.log) {
            this.options.log(msg, isErr);
            return;
        }
        const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        let text = `[${date}] ${msg}`;
        if(isErr) console.error(msg);
        else console.log(text);
    }

    _isStr(s) {
        return !!s && ((typeof s === 'string') || (s instanceof String));
    }

    addTask(taskName, taskDependencies, taskFun, taskData) {
        if(!this._isStr(taskName)) throw new Error('taskName required string');
        if(taskDependencies === undefined) taskDependencies = null;
        if(taskFun === undefined) taskFun = null;
        if(taskData === undefined) taskData = null;

        let td = taskDependencies;
        let tf = taskFun;
        let tu = taskData;

        if((typeof td === 'function') && !tf) {
            td = null;
            tf = taskDependencies;
            tu = taskFun;
        }

        if(!!tf && (typeof tf !== 'function')) throw new Error('taskFun must be a function');
        this.tasks[taskName] = { dep: this._toArray(td), cb: tf, userData: tu };
    }

    t(taskName, taskDependencies, taskFun, taskData) {
        this.addTask(taskName, taskDependencies, taskFun, taskData);
    }

    dumpTasks(logger) {
        var l = !!logger ? logger : console.log;
        var keys = Object.keys(this.tasks);
        if(!keys) return;
        keys.sort().forEach(k => {
            var t = this.tasks[k];
            l(`${k} : ${JSON.stringify(t.dep)} : ${!!t.cb ? '*': '' }`);
        });
        l(`# ${keys.length} task(s)`);
    }

}

if(!GLOBAL.CCA2AB34EC9C4040A54324D4348540E7) {
    let defaultRunner = new GRunner(); // per process
    defaultRunner.GRunner = GRunner;
    GLOBAL.CCA2AB34EC9C4040A54324D4348540E7 = defaultRunner;
}

module.exports = GLOBAL.CCA2AB34EC9C4040A54324D4348540E7;