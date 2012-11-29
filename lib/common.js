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

module.exports.getToken = function(username, playsetType, playsetId, version){
    return [username, playsetType, playsetId, version].join(":");
};

module.exports.unpackToken = function(token){
    var data = token.split(":");
    return({
		'username': data[0],
		'playsetType': data[1],
		'playsetId': data[2],
		'version': data[3]
    });
};

module.exports.getChannel = function(token){
    var unpacked = module.exports.unpackToken(token),
        channelMap = {
            'user': unpacked.playsetId + ':loved',
            'site': 'site:' + unpacked.playsetId + ':songs_added'
        };
    return channelMap[unpacked.playsetType];
};

module.exports.getShuffleUrl = function(){
    // Since Shuffle doesn't have this route yet, always hit fauxfm.
    // When Shuffle is ready, edit 'production' junto config
    // with the right address and uncomment this.
    //
    // if (process.env.NODE_ENV === 'testing' ||
    //     process.env.NODE_ENV === 'development'){
    //     return 'http://' +
    //         nconf.get('shuffle').host + ':' +
    //         nconf.get('shuffle').port + '/shuffle';
    // }
    // return 'http://' + nconf.get('shuffle').host;

    return 'http://' + nconf.get('shuffle').host + ':' + nconf.get('shuffle').port + '/shuffle';
};

module.exports.Options = Options;