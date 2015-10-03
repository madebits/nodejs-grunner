'use strict';

const __ = require('async')
    , fs = require('fs')
    , path = require('path')
    , through = require('through2')
    , mkdirp = require('mkdirp');

// not intended to be used directly
class GUtils {

    static toArray(o) {
        if (!o) return [];
        if (!Array.isArray(o)) {
            o = [o];
        }
        return o;
    }

    static isStr(s) {
        return !!s && ((typeof s === 'string') || (s instanceof String));
    }

    static fixLine(line) {
        if(!line) return '';
        if (line.endsWith('\r\n')) line = line.substr(0, line.length - 2);
        else if (line.endsWith('\n')) line = line.substr(0, line.length - 1);
        return line;
    }

    static parseVars(str, handler) {
        function process(s) {
            if(!s) return '';
            return s.replace(/\[\[(.+?)\]\]/g, function(m, e){
                const v = handler(e);
                return v ? process(v) : '';
            });
        }
        return process(str);
    }

    static readFile(file, enc, throwErr) {
        if(!file) return null;
        const read = function() {
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

    static writeFile(file, data, enc) {
        if(!file) throw new Error('file');
        mkdirp.sync(path.dirname(file));
        fs.writeFileSync(file, data, enc);
    }

    static del(p) {
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
            const itemPath = path.join(p, item);
            GUtils.del(itemPath);
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
    }

    static files(dir, recursive, filter) {
        let count = 0;
        let error = false;
        let filesCount = 0;

        const s = through.obj(function(file, enc, cb) {
            cb(null, file);
        });

        const onDone = function (e) {
            if(e) {
                error = true;
                s.emit('error', e);
            }
            s.end();
        };

        const add = function(file) {
            if(!error) {
                file.count = ++filesCount;
                s.write(file);
            }
        };

        const scan = function(entryDir, dir, doneCb) {
            count++;

            const done = function(err) {
                if(err) {
                    doneCb(err);
                    return;
                }
                count--;
                if(!error && (count === 0)) {
                    doneCb();
                }
            };

            fs.readdir(dir, function(err, items) {
                if(err) {
                    done(err);
                    return;
                }
                const dirs = [];
                items = items || [];

                for (let i = 0; i < items.length; i++) {
                    if(error) break;
                    const itemPath = path.join(dir, items[i]);
                    try {
                        const stat = fs.statSync(itemPath);
                        if (stat.isFile()) {
                            const fpath = path.resolve(itemPath);
                            let rpath = fpath.substr(entryDir.length);
                            if(rpath.startsWith('/') || rpath.startsWith('\\')) rpath = rpath.substr(1);
                            const obj = ({dir: entryDir,
                                path: fpath,
                                name: items[i],
                                ext: path.extname(items[i]) || '',
                                relative: rpath,
                                stats: stat });
                            if (!filter || filter(obj)) {
                                add(obj);
                            }
                        }
                        else if (stat.isDirectory()) {
                            dirs.push(itemPath);
                        }
                    } catch (e) {
                        done(e);
                        break;
                    }
                }

                if(recursive) {
                    const next = dirs.map(d => __cb => {
                        setTimeout(function() {
                            scan(entryDir, d, doneCb);
                            __cb();
                        }, 0);
                    });
                    __.series(next, (err) => {
                        done(err);
                    });
                }
                else {
                    process.nextTick(done);
                }
            });

        };

        if(dir) {
            const dirs = GUtils.toArray(dir).map(d => __cb => {
                d = path.resolve(d);
                scan(d, d, function(err) {
                    __cb(err);
                });
            });
            if(dirs.length) {
                setTimeout(function () {
                    __.series(dirs, function (err) {
                        onDone(err);
                    });
                }, 0);
            }
            else {
                onDone();
            }
        }
        else {
            onDone();
        }

        return s;
    }

    static pipeStart(o) {
        const s = through.obj(function(obj, enc, cb) {
            cb(null, obj);
        });
        if(o) {
            for(let x of o) {
                const temp = x;
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

    static pipeThrough(eachFn, flushFn) {
        return through.obj(function(o, e, cb) {
            const _this = this;
            if(eachFn) {
                cb.push = _this.push.bind(_this);
                eachFn(o, cb);
            }
            else cb();
        }, function(cb) {
            const _this = this;
            if(flushFn) {
                cb.push = _this.push.bind(_this);
                flushFn(cb);
            }
            else cb();
        });
    }

}

module.exports = GUtils;