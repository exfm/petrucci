"use strict";

var Petrucci = require('./model'),
    redis = require('redis'),
    util = require('util'),
    when = require('when'),
    common = require('./common'),
    host, port, db, redis_client,
    connected = false;

function onMessage(channel, message){
    var songs = [],
        data;
    Petrucci.getTokens(channel).then(
        function(petrucci){
            data = JSON.parse(message);
            if (data instanceof Array){
                data.map(function(song){
                    songs.push(common.base36decode(song));
                });
            }
            else {
                songs = [common.base36decode(data)];
            }
            Petrucci.addNewSongs(petrucci.tokens, songs);
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
    connected = true;
};

module.exports.subscribe = function(channel){
    var d = when.defer();
    redis_client.send_command("subscribe", [channel], function(data){
        d.resolve();
    });
    return d.promise;
};

module.exports.unsubscribe = function(channel){
    var d = when.defer();
    redis_client.send_command("unsubscribe", [channel], function(data){
        d.resolve();
    });
    return d.promise;
};
