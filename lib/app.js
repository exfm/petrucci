"use strict";

var Petrucci = require("./model"),
    express = require("express"),
    sequence = require("sequence"),
    request = require("superagent"),
    nconf = require("nconf"),
    getConfig = require("junto"),
    util = require("util"),
    _ = require("underscore"),
    plog = require('plog'),
    when = require('when'),
    log = plog('petrucci.app'),
    common = require('./common'),
    stream = require('stream'),
    nurse = require('nurse'),
    redisBridge = require('./redisbridge'),
    genreWatcher = require('./genrewatcher');

function throwRejection(next){
    return function(err){
        return next(err);
    };
}

function ok(res){
    res.send(200);
}

function ApiError(status, message) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
    Error.call(this, message, ApiError);
}
util.inherits(ApiError, Error);

var app = module.exports = express();

// Configuration
app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());

    // Use a stream to move log lines from the fantastic logger middleware
    // to winston.
    var s = new stream.Stream();
    s.writable = true;
    s.write = function(data){
        log.info(data.toString().replace('\n', ''));
        return true;
    };
    app.use(express.logger({'format': 'tiny', 'stream': s}));

    app.use(app.router);
    app.use(errorHandler);
});

function errorHandler(err, req, res, next){
    res.send(err.status || 400, err.message);
}

app.configure('production', function(){
    plog.find(/^petrucci/)
        .remove('console')
        .file('./logs/petrucci.log')
        .level('info');

});

app.configure('testing', function(){
    plog.find(/^petrucci/)
        .remove('console')
        .file('./logs/petrucci.log')
        .level('silly');
});

module.exports = app;

// @todo move this into the model
module.exports.connectRedis = function(){
    var d = when.defer();
    // Start the redis bridge, using redis server info from junto
    redisBridge.connect(common.isLocal() ? 'localhost' : nconf.get("redis").host,
        common.isLocal() ? 6379 : nconf.get("redis").port, 0).then(function(){
            // Set up Petrucci events
            // @todo only connect to redisBridge if it's a user or site
            // if it's a genre, connect to the genrewatcher
            Petrucci.on('subscribe', function(id){
                var data = common.unpackId(id);
                if (data.playsetType === 'user' ||
                    data.playsetType === 'site'){
                    redisBridge.subscribe(common.getRedisChannelFromId(id));
                }
                else if (data.playsetType === 'genre'){
                    genreWatcher.watchGenre(data.playsetId);
                }
            });
            d.resolve();
        });
    return d.promise;
};

app.get("/health-check", function(req, res){
    res.send(nurse({'ok': true, 'server': app.server}));
});

app.get('/favicon.ico', function(req, res){
    res.send(404, "NOT FOUND");
});

app.post("/", function(req, res, next){
    Petrucci.subscribeToPlayset(req.body.token).then(ok(res), throwRejection(next));
});

app.post("/unsubscribe", function(req, res, next){
    Petrucci.unsubscribeFromPlayset(req.body.token).then(ok(res), throwRejection(next));
});

module.exports = app;
