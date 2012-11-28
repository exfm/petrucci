"use strict";

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

// @todo (jonathan) better function name
module.exports.unpackToken = function(token){
    return token.split(":");
};

module.exports.Options = Options;