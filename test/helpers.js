"use strict";

process.env.NODE_ENV = "testing";

exports.covRequire = function(s){
    if(process.env.COVERAGE){
        s = s.replace("lib", "lib-cov");
    }
    return require(s);
};

var when = require('when'),
    sequence = require('sequence'),
    assert = require("assert"),
    nconf = require("nconf"),
    getConfig = require("junto"),
    plog = require('plog'),
    aws = require('plata'),
    common = require('../lib/common'),
    redisBridge = require('../lib/redisbridge'),
    magneto = require('magneto');

var Petrucci = exports.covRequire('../lib/model'),
    app = exports.covRequire('../lib/app');

nconf.defaults({
    'MAMBO_BACKEND': 'magneto',
    'MAGNETO_PORT': 8082,
    'TABLE_PREFIX': 'Test',
    'HOST': 'localhost',
    'PORT': 3001
});

process.env.MAMBO_BACKEND = nconf.get('MAMBO_BACKEND');
process.env.MAGNETO_PORT = nconf.get('MAGNETO_PORT');

magneto.server = null;
magneto.setLogLevel(50);

var server = null;

exports.petrucciIds = [];
exports.listeners = [];

plog
    .find(/^petrucci/)
    .file('./logs/petrucci.log')
    .level('silly');

exports.setup = function(cb){
    sequence().then(function(next){
        getConfig(nconf.get("NODE_ENV")).then(function(config){
            nconf.overrides(config);
            if(nconf.get('MAMBO_BACKEND') === 'magneto'){
                if(!magneto.server){
                    magneto.server = magneto.listen(nconf.get('MAGNETO_PORT'), next);
                    return;
                }
            }
            return next();
        });
    }).then(function(next){
        Petrucci.connect(nconf.get("aws:key"), nconf.get("aws:secret"),
            nconf.get('TABLE_PREFIX'));
        Petrucci.createAll().then(next);
    }).then(function(next){
        Petrucci.aws.connect({
            'key': nconf.get("aws:key"),
            'secret': nconf.get("aws:secret")
        });
        Petrucci.aws.onConnected(next);
    }).then(function(next){
        if(!server){
            server = app.listen(nconf.get('PORT'), nconf.get('HOST'), function(){
                next();
            });
        }
        else{
            next();
        }
    }).then(function(next){
        app.connectRedis();
        cb();
    });
};

exports.teardown = function(cb){
    exports.teardownPetruccis().then(function(){
        exports.teardownListeners();
        cb();
    });
};

function randint(){
    return parseInt(Math.random() * 100000000000, 10);
}
exports.teardownPetruccis = function(){
    var d = when.defer();
    if(exports.petrucciIds.length === 0){
        return d.resolve();
    }
    when.all(exports.petrucciIds.map(function(id){
        var p = when.defer();
        Petrucci.destroy(id).then(function(){
            exports.petrucciIds.splice(
                exports.petrucciIds.indexOf(id),
                1);
            p.resolve();
        }, p.reject);
        return p.promise;
    })).then(d.resolve, d.reject);
    return d.promise;
};

exports.teardownListeners = function(){
    exports.listeners.map(function(listener){
        Petrucci.removeListener(listener.event, listener.callback);
        exports.listeners.splice(
            exports.listeners.indexOf(listener),
            1);
    });
};

exports.getRedisInfo = function(){
    return ({
        'port': common.isLocal() ? 6379 : nconf.get("redis_port"),
        'host': common.isLocal() ? 'localhost' : nconf.get("redis_host")
    });
};
