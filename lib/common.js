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

module.exports.Options = Options;