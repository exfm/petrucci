"use strict";

var Petrucci = require('./model'),
    redis = require('redis'),
    util = require('util'),
    when = require('when'),
    common = require('./common'),
    plog = require('plog'),
    log = plog('petrucci.redisbridge'),
    host, port, db, redis_client,
    connected = false;

function onMessage(redisChannel, message){
    log.silly('received message ' + message + 'on channel + ' + redisChannel);
    var songs = [],
        data;
    Petrucci.getTokens(common.getIdFromRedisChannel(redisChannel)).then(
        function(petrucci){
            data = JSON.parse(message);
            if (data.hasOwnProperty('song_ids')){
                data.song_ids.map(function(song){
                    songs.push(song);
                });
            }
            else {
                songs.push(data.id);
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

module.exports.subscribe = function(redisChannel){
    log.silly('subscribed to channel ' + redisChannel);
    var d = when.defer();
    redis_client.send_command("subscribe", [redisChannel], function(data){
        d.resolve();
    });
    return d.promise;
};

module.exports.unsubscribe = function(redisChannel){
    var d = when.defer();
    redis_client.send_command("unsubscribe", [redisChannel], function(data){
        d.resolve();
    });
    return d.promise;
};
