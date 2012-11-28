"use strict";

var Petrucci = require('./model'),
    Shuffle = require('shuffle'),
    redis = require('redis'),
    util = require('util'),
    when = require('when'),
    common = require('./common'),
    host, port, db, redis_client;

function onMessage(channel, message){
    Petrucci.getTokens(channel).then(
        function(object){
            Shuffle.addNewSongs(object.tokens, JSON.parse(message));
        }, function(err){
            throw new Error(err);
        }
    );
}

module.exports.connect = function(host, port, db){
    redis_client = redis.createClient(port, host);
    redis_client.on('error', function(err){
        throw new Error(err);
    });
    redis_client.on('message', onMessage);
    redis_client.select(db);
};

module.exports.subscribe = function(channel){
    var d = when.defer();
    this.redis_client.send_command("subscribe", [channel], function(data){
        d.resolve();
    });
    return d.promise;
};

module.exports.unsubscribe = function(channel){
    var d = when.defer();
    this.redis_client.send_command("unsubscribe", [channel], function(data){
        d.resolve();
    });
    return d.promise;
};
