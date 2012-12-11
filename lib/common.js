"use strict";

var nconf = require('nconf');

// ## Options
// Provides a simple object wrapper so that `.get` can be called with
// defaults and we don't have to use is defined checks or booleans
// all over the place.
// Constructor just takes another object and sets the instances
// keys to the same value as the object's.
function Options(data){
    for(var key in data){
        this[key] = data[key];
    }
}

// Get a value from the object by key specifying an optional default.
// If the default or the key value is a function, it will be called
// and returned.
Options.prototype.get = function(key, defaultValue){
    if(this.hasOwnProperty(key)){
        return (typeof this[key] === 'function') ? this[key]() : this[key];
    }
    return (typeof defaultValue === 'function') ? defaultValue() : defaultValue;
};

module.exports.error = function(err){
    throw new Error(err);
};

module.exports.base36decode = function(s){
    return parseInt(s, 36);
};

module.exports.base36encode = function(s){
    return s.toString(36);
};

module.exports.extractIds = function(songs){
    return songs.map(function(song){return module.exports.base36decode(song.id);});
};

module.exports.isLocal = function(){
    if ((process.env.NODE_ENV === 'testing' &&
        process.env.JENKINS === 1) ||
        process.env.NODE_ENV === 'production') {
        return false;
    }
    return true;
};

module.exports.getToken = function(username, playsetType, playsetId, created){
    return [username, playsetType, playsetId, created].join(":");
};

module.exports.unpackToken = function(token){
    var data = token.split(":");
    return({
		'username': data[0],
		'playsetType': data[1],
		'playsetId': data[2],
		'created': data[3]
    });
};

module.exports.unpackId = function(id){
    var data = id.split(':');
    return({
        'playsetType': data[0],
        'playsetId': data[1]
    });
};

module.exports.getIdFromToken = function(token){
    var data = module.exports.unpackToken(token),
        channelMap = {
            'user': 'user:' + data.playsetId,
            'site': 'site:' + data.playsetId,
            'genre': 'genre:' + data.playsetId
        };
    return channelMap[data.playsetType];
};

module.exports.getIdFromRedisChannel = function(redisChannel){
    var data = redisChannel.split(':');
    if (data[0] === 'site'){
        return 'site:' + data[1];
    }
    else if (data[1] === 'loved'){
        return 'user:' + data[0];
    }
    else {
        throw new Error('Unknown redis channel');
    }
};

module.exports.getRedisChannelFromId = function(id){
    var data = module.exports.unpackId(id),
        redisChannelMap = {
        'user': data.playsetId + ':loved',
        'site': id + ':songs_added'
    };
    return redisChannelMap[data.playsetType];
};

module.exports.getShuffleUrl = function(){
    if (process.env.NODE_ENV === 'testing' ||
        process.env.NODE_ENV === 'development'){
        return 'http://' +
            nconf.get('shuffle').host + ':' +
            nconf.get('shuffle').port + '/shuffle';
    }
    return 'http://' + nconf.get('shuffle').host;
};

module.exports.Options = Options;