"use strict";

var Node-petrucci = require("./model"),
    express = require("express"),
    sequence = require("sequence"),
    request = require("superagent"),
    nconf = require("nconf"),
    getConfig = require("junto"),
    util = require("util"),
    _ = require("underscore"),
    log = require('./log'),
    nurse = require('nurse'),
    winston = require('winston'),
    expressWinston = require('express-winston');

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

function errorHandler(err, req, res, next){
    res.send(err.status || 400, err.message);
}

function jsonBody(req, res, next){
    if (req._body){
        return next();
    }
    req.body = req.body || {};

    // flag as parsed
    req._body = true;

    var buf = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk){
        buf += chunk;
    });
    req.on('end', function(){
        try {
            req.body = JSON.parse(buf);
            next();
        } catch (err){
            return next(new ApiError(404, "Invalid JSON in post body."));
        }
    });
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

// create
app.post("/", function(req, res, next){
    Node-petrucci.create(req.body).then(function(node-petrucci){
        log.debug('Created node-petrucci', node-petrucci);
        if(!node-petrucci){
            return next(new ApiError(400, "Node-petrucci with title " + req.body.title + " not created."));
        }
        return res.send(node-petrucci);
    }, throwRejection);
});

//
app.get("/:id", function(req, res, next){

    var id = req.params.id;

    Node-petrucci.getById(Number(id)).then(function(node-petrucci){
        if(!_.isEmpty(node-petrucci)){
            return res.send(node-petrucci);
        }
        return next(new ApiError(404, "Unknown node-petrucci id: " + id + "."));
    }, function(err){
        return next(new ApiError(400, err));
    });
});

module.exports = app;
