"use strict";

let __ = require('async')
    , Stream = require('stream').Stream
    , through = require('through2')
    , util = require('util')
    , fs = require('fs')
    , path = require('path')
    , mkdirp = require('mkdirp')
    ;

function CircularDependencyError(value) {
    this.message = value;
    let error = new Error(this.message);
    this.stack = error.stack;
}
CircularDependencyError.prototype = Object.create(Error.prototype);
CircularDependencyError.prototype.name = CircularDependencyError.name;
CircularDependencyError.constructor = CircularDependencyError;

class GRunner {

    constructor(options) {
        this.options = options || {};
        this.tasks = {};
        this.lifeTimer = null;
    }

    _cloneCtx(ctx) {
        if(!ctx) return { depth: 0, type: '' };
        return Object.assign({}, ctx);
    }

    _incCtx (ctx, type) {
        ctx = this._cloneCtx(ctx);
        ctx.depth++;
        ctx.type += type;
        return ctx;
    }

    _toArray(o) {
        if(!o) return [];
        if(!Array.isArray(o)) {
            o = [ o ];
        }
        return o;
    }

    _depMap(dependencies, ctx, stack) {
        let _this = this;
        let serFun = [];
        dependencies = _this._toArray(dependencies);
        if(!dependencies.length) {
            return serFun;
        }
        ctx = _this._incCtx(ctx, 's');
        let depFun = dependencies.map(d => {
            if(Array.isArray(d)) {
                return __cb => {
                    let f = d.map(pd => {
                        return __cb => {
                            if(Array.isArray(pd)) {
                                let nestedSerFun = _this._depMap(pd, ctx, stack);
                                __.series(nestedSerFun, __cb);
                                return;
                            }
                            _this._runner(pd, __cb, _this._incCtx(ctx, 'p'), stack);
                        };
                    });
                    __.parallel(f, __cb);
                };
            }
            return __cb => {
                _this._runner(d, __cb, ctx, stack);
            };
        });
        serFun.push(...depFun);
        return serFun;
    }

    _runner(taskName, cb, ctx, stack) {
        let _this = this;
        if(!taskName) throw new Error('taskName required');
        if(!cb) throw new Error('cb required');
        let task = _this.tasks[taskName];
        if(!task) throw new Error('Undefined task: ' + taskName);
        _this.log(`Run: ${taskName}`);
        if(!_this.options.noLoopDetection) {
            if (stack.indexOf(taskName) >= 0) {
                process.nextTick(function () {
                    cb(new CircularDependencyError(`Loop: ${taskName} =>\n` + stack.join(',')));
                });
                return;
            }
            stack.push(taskName);
        }
        //console.log(stack);
        ctx = _this._cloneCtx(ctx);
        let serFun = _this._depMap(task.dep, ctx, stack);
        serFun.push(__cb => {
            _this._exec(taskName, task, __cb, ctx);
        });
        process.nextTick(function() {
            __.series(serFun, function(err) {
                if(!_this.options.noLoopDetection) {
                    stack.pop();
                }
                cb(err);
            });
        }, 0);
    }

    run(taskName, cb) {
        if(!this.options) this.options = {};
        if(!this.tasks) this.tasks = {};
        if(!taskName) taskName = 'default';
        this.log(`Start${this.options.dryRun ? ' [!DryRun!]' : ''} [${taskName}]`);
        let doneCb = err => {
            let msg = `End [${err ? 'Failed' : 'Success'}]`;
            if(err) msg += `\n# Failed: ${err}`;
            this.log(msg);
            if (cb) cb(err);
        };
        try {
            this._runner(taskName, doneCb, null, []);
        } catch(e) {
            doneCb(e);
        }
    }

    _handleResult(taskName, res, doneCb) {
        if(!res) return;

        if(typeof res.then === 'function') {
            res.then(
                () => doneCb(),
                err => doneCb(err || new Error(`Failed ${taskName}`)));
        }
        else if((res instanceof Stream) && (typeof res.pipe === 'function')) {
            res.on('error', err => {
                doneCb(err);
                res.end();
            });
            let onPipeEnd = through.obj((o, enc, cb) => cb(), cb => {
                doneCb(); cb();
            } );
            res.pipe(onPipeEnd);
        }
        else doneCb(new Error('Unsupported task return type!'));
    }

    _exec(taskName, task, cb, info) {
        let _this = this;
        let ctx = Object.assign(_this._cloneCtx(info), { taskName, runner: _this, task });
        const pad = new Array(ctx.depth + 1).join('.');
        const parallel = ctx.type.endsWith('p') ? '|' : '';
        this.log(`+ ${pad}${parallel} ${taskName}${_this.options.verbose ? ' ' + ctx.type : ''}`);

        let doneCb = (function (){
            let doneCbCalled = false;
            return err => {
                if(doneCbCalled) return;
                doneCbCalled = true;
                if(err) _this.log(err, true);
                if(_this.options.afterTaskRun) _this.options.afterTaskRun(ctx);
                _this.log(`- ${pad}${parallel} ${taskName}`);
                process.nextTick(() => cb(err));
            };
        })();

        let resHandler = (result, callback) => {
            if(!callback) callback = doneCb;
            if(!res) {
                callback();
                return;
            }
            _this._handleResult(taskName, result, callback);
        };
        doneCb.ctx = ctx;
        doneCb.onDone = resHandler;

        if(_this.options.beforeTaskRun) _this.options.beforeTaskRun(ctx);
        let taskFun = (task.cb && !_this.options.dryRun) ? task.cb : cb => cb();

        let res = null;
        try {
            res = _this.options.exec
                ? _this.options.exec(doneCb)
                : taskFun(doneCb);
        } catch(e) {
            doneCb(e);
            return;
        }
        _this._handleResult(taskName, res, doneCb);
    }

    _fixLine(line) {
        if(!line) return '';
        if (line.endsWith('\r\n')) line = line.substr(0, line.length - 2);
        else if (line.endsWith('\n')) line = line.substr(0, line.length - 1);
        return line;
    }

    log(msg, isErr, taskName) {
        let _this = this;
        if(this.options.log) {
            this.options.log(msg, isErr, taskName);
            return;
        }

        if(!msg) msg = '';
        const utilError = util.isError(msg);
        const date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        const prefix = `${_this.options.name ? _this.options.name : ''} [${date}] ${taskName ? `[${taskName}]` : ''}${(!!isErr || utilError) ? '!' : ''}`;

        if(utilError) {
            console.error(prefix, msg);
        }
        else {
            _this._fixLine(msg.toString()).split('\n').forEach(line => {
                if(isErr) console.error(prefix, _this._fixLine(line));
                else console.log(prefix, _this._fixLine(line));
            });
        }
    }

    _isStr(s) {
        return !!s && ((typeof s === 'string') || (s instanceof String));
    }

    addTask(taskName, taskDependencies, taskFun, userData) {
        if(!this._isStr(taskName)) throw new Error('taskName required string');
        let setNull = o => { if(o === undefined) { o = null; } return o; };
        taskDependencies = setNull(taskDependencies);
        taskFun = setNull(taskFun);
        userData = setNull(userData);

        let td = taskDependencies;
        let tf = taskFun;
        let tu = userData;

        if(typeof td === 'function') {
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
        let l = !!logger ? logger : console.log;
        let keys = Object.keys(this.tasks);
        if(!keys) return;
        let totalLines = 0;
        l('# TaskName : Dependencies : TaskFun (code lines)');
        keys.sort().forEach(k => {
            let t = this.tasks[k];
            let tf = '(*)';
            if(!!t.cb) {
                tf = (t.cb.toString().match(/\n/g) || []).length;
                if(tf === 0) tf = 1;
                totalLines += tf;
                tf = `(${tf})`;
            }
            l(`${k} : ${JSON.stringify(t.dep)} : ${tf}`);
        });
        l(`# Total ${keys.length} task(s) : ${totalLines} line(s)`);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    pipeStart(o) {
        let s = through.obj(function(obj, enc, cb) {
            cb(null, obj);
        });
        if(o) {
            for(let x of o) {
                let temp = x;
                process.nextTick(function() {
                    s.write(temp);
                });
            }
        }
        process.nextTick(function() {
            s.end();
        });
        return s;
    }

    pipeThrough(eachFn, flushFn) {
        return through.obj(function(o, e, cb) {
            let _this = this;
            if(eachFn) {
                cb.push = _this.push.bind(_this);
                eachFn(o, cb);
            }
            else cb();
        }, function(cb) {
            let _this = this;
            if(flushFn) {
                cb.push = _this.push.bind(_this);
                flushFn(cb);
            }
            else cb();
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    _parseVars(str, handler) {
        function process(s) {
            if(!s) return s;
            return s.replace(/\[\[(.+?)\]\]/g, function(m, e){
                let v = handler(e);
                return v ? process(v) : '';
            });
        }
        return process(str);
    }

    envValue(value) {
        return this._parseVars(value, e => process.env[e]);
    }

    env(e) {
        return this.envValue(process.env[e]);
    }

    setProcessMaxLifeTime(timeInMinutes, cb) {
        let _this = this;
        if(_this.lifeTimer) {
            clearTimeout(_this.lifeTimer);
            _this.log('Maximum process life timer off!');
        }
        if(timeInMinutes <= 0) return;
        _this.log(`Maximum process life timer: ${timeInMinutes} minute(s)!`);
        _this.lifeTimer = setTimeout(function() {
            if(cb) {
                cb();
            }
            else {
                _this.log(`Maximum process life time of ${timeInMinutes} minute(s) reached. Terminating ...!`);
                process.exit(1);
            }
        }, timeInMinutes * 60 * 1000);
        _this.lifeTimer.unref();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    _readFile(file, enc, throwErr) {
        if(!file) return null;
        let read = function() {
            return fs.readFileSync(file, enc);
        };
        try {
            return read();
        } catch (e) {
            try { // retry
                return read();
            }
            catch(e) {
                if(throwErr) throw e;
                return null;
            }
        }
    }

    _writeFile(file, data, enc) {
        if(!file) throw new Error('file');
        mkdirp.sync(path.dirname(file));
        fs.writeFileSync(file, data, enc);
    }

    fileReadBin(file, throwErr) {
        return this._readFile(file, null, throwErr);
    }

    fileReadTxt(file, throwErr) {
        let data = this._readFile(file, 'utf8', throwErr);
        if(data === null) return null;
        return data.replace(/^\uFEFF/, '');
    }

    fileReadJson(file, throwErr) {
        try {
            let data = this.fileReadTxt(file);
            if(data === null) return null;
            return JSON.parse(data);
        } catch(e) {
            if(throwErr) throw e;
            return null;
        }
    }

    fileWriteBin(file, data) {
        this._writeFile(file, data);
    }

    fileWriteTxt(file, data) {
        if(!data) data = '';
        this._writeFile(file, data, 'utf8');
    }

    fileWriteJson(file, data) {
        if(!data) data = {};
        this.fileWriteTxt(file, JSON.stringify(data, null, '\t'));
    }

    files(dir, recursive, filter) {
        let count = 0;
        let error = false;

        let s = through.obj(function(file, enc, cb) {
            cb(null, file);
        });

        let onError = function (e) {
            error = true;
            s.emit('error', e);
            s.end();
        };

        let add = function(file) {
            if(!error) {
                s.add(file);
            }
        };

        let process = function(_dir) {
            count++;

            let done = function() {
                count--;
                if(!error && (count === 0)) {
                    s.end();
                }
            };

            fs.readdir(_dir, function(err, items) {
                if(err) {
                    onError(err);
                    return;
                }
                let dirs = [];
                items = items || [];

                for (let i = 0; i < items.length; i++) {
                    if(error) break;
                    let itemPath = path.join(_dir, items[i]);
                    try {
                        let stat = fs.statSync(itemPath);
                        if (stat.isFile()) {
                            let obj = ({dir, file: path.resolve(itemPath), name: items[i], ext: path.extname(items[i]) || '' });
                            if (!filter || filter(obj)) {
                                s.write(obj);
                            }
                        }
                        else if (stat.isDirectory()) {
                            dirs.push(itemPath);
                        }
                    } catch (e) {
                        onError(e);
                    }
                }

                if(recursive) {
                    let next = dirs.map(d => _cb => {
                        setTimeout(function() {
                            process(d);
                            _cb();
                        }, 0);
                    });
                    __.series(next, (err) => {
                        if(err) onError(err);
                        done();
                    });
                }
                else {
                    done();
                }
            });

        };

        if(dir) {
            dir = path.resolve(dir);
            setTimeout(function () {
                process(dir);
            }, 0);
        }
        else {
            s.end();
        }

        return s;
    }

    rm(dirOrFile) {

        let del = function (p) {
            if (!p) return;
            let stat = null;
            try {
                stat = fs.statSync(p);
            } catch (e) {
                return;
            }
            if (stat == null) return;
            if (stat.isFile()) {
                fs.unlinkSync(p);
                return;
            }
            if (!stat.isDirectory()) return;
            fs.readdirSync(p).forEach(function (item) {
                let itemPath = path.join(p, item);
                del(itemPath);
            });
            let deleted = false;
            for (let i = 0; i < 50; i++) {
                try {
                    fs.rmdirSync(p);
                    deleted = true;
                } catch (e) {
                }
                if (deleted) break;
            }
            if (!deleted) {
                fs.rmdirSync(p);
            }
        };

        del(dirOrFile);
    }

} //EOC

if(!GLOBAL.CCA2AB34EC9C4040A54324D4348540E7) {
    let g = new GRunner(); // per process
    g.GRunner = GRunner;
    GLOBAL.CCA2AB34EC9C4040A54324D4348540E7 = g;
}

module.exports = GLOBAL.CCA2AB34EC9C4040A54324D4348540E7;
