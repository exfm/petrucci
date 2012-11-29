"use strict";

var Petrucci = require("./model"),
    express = require("express"),
    sequence = require("sequence"),
    request = require("superagent"),
    nconf = require("nconf"),
    getConfig = require("junto"),
    util = require("util"),
    _ = require("underscore"),
    log = require('./log'),
    common = require('./common'),
    nurse = require('nurse'),
    winston = require('winston'),
    expressWinston = require('express-winston'),
    redisBridge = require('./redisbridge');

function throwRejection(err){
    throw err;
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
    app.use(expressWinston.logger({
        transports: [
            new winston.transports.File({
                'level': "silly",
                'timestamp': true,
                'filename': process.env.PWD + "/logs/access.log"
            })
        ]
    }));
    app.use(expressWinston.errorLogger({
        transports: [
            new winston.transports.File({
                'level': "silly",
                'timestamp': true,
                'filename': process.env.PWD + "/logs/error.log"
            })
        ]
    }));
    app.use(app.router);
    app.use(errorHandler);
});

// Start the redis bridge, using redis server info from junto
redisBridge.connect(
    common.isLocal() ? 'localhost' : nconf.get("redis_host"),
    common.isLocal() ? 6379 : nconf.get("redis_port"),
    0);

// Set up Petrucci events
Petrucci.on('subscribe', redisBridge.subscribe);

function errorHandler(err, req, res, next){
    res.send(err.status || 400, err.message);
}

module.exports = app;

// Routes

// Needed by the load balancer
app.get("/health-check", function(req, res){
    res.send(nurse({'ok': true, 'server': app.server}));
});

app.get('/favicon.ico', function(req, res){
    res.send(404, "NOT FOUND");
});

app.post("/", function(req, res, next){
    Petrucci.subscribeToPlayset(
        req.body.token
    ).then(
    function(){
        res.send(200);
    },
    function(err){
        next(err);
    });
});

module.exports = app;
