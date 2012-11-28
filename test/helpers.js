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

exports.setup = function(cb){
    sequence().then(function(next){
        getConfig(nconf.get("NODE_ENV")).then(function(config){
            nconf.overrides(config);
            if(nconf.get('MAMBO_BACKEND') === 'magneto'){
                if(!magneto.server){
                    magneto.server = magneto.listen(nconf.get('MAGNETO_PORT'), next);
                }
            }
            next();
        });
    }).then(function(next){
        Petrucci.connect(nconf.get("aws:key"), nconf.get("aws:secret"),
            nconf.get('TABLE_PREFIX'));
        Petrucci.createAll().then(function(){
            next();
        });
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
        cb();
    });
};

exports.teardown = function(cb){
    exports.teardownPetruccis().then(function(){
        cb();
    });
};

function randint(){
    return parseInt(Math.random() * 100000000000, 10);
}

exports.petrucciIds = [];

exports.createPetrucci = function(opts){
    opts = opts || {};
    var d = when.defer();
    if(!opts.hasOwnProperty('title')){
        opts.title = "a title";
    }
    Petrucci.create(opts).then(function(petrucci){
        exports.petrucciIds.push(petrucci.id);
        d.resolve(petrucci);
    }, function(err){
        throw new Error(err);
    });
    return d.promise;
};

exports.teardownPetruccis = function(){
    var d = when.defer();
    if(exports.petrucciIds.length === 0){
        return d.resolve();
    }
    when.all(exports.petrucciIds.map(function(id){
        return Petrucci.destroy(id);
    }), function(){
        d.resolve();
    });
    return d.promise;
};
