 "use strict";

var mambo = require("mambo"),
    Model = mambo.Model,
    Schema = mambo.Schema,
    StringField = mambo.StringField,
    NumberField = mambo.NumberField,
    JSONField = mambo.JSONField,
    DateField = mambo.DateField,
    BooleanField = mambo.BooleanField,
    StringSetField = mambo.StringSetField,
    NumberSetField = mambo.NumberSetField,

    sequence = require("sequence"),
    when = require("when"),
    _ = require("underscore"),
    nconf = require("nconf"),
    request = require("superagent"),
    redis = require('redis'),
    log = require("./log"),
    redisBridge = require('./redisBridge'),
    events = require('events'),
    util = require('util'),

    common = require("./common"),
    Options = common.Options;

var petrucciSchema = new Schema('Petrucci', 'petrucci', 'channel', {
    'channel': StringField,
    'tokens': JSONField,
    'created': DateField
});

var Petrucci = new Model(petrucciSchema);
util.inherits(Petrucci, events.EventEmitter);

Petrucci.getTokens = function(channel){
    return this.get("petrucci", channel);
};

Petrucci.subscribeToPlayset = function(token){
    var q,
        self = this,
        d = when.defer(),
        created = new Date(),
        channel = common.getChannel(token),
        petrucci = {
            'channel': channel,
            'tokens': [token],
            'created': created
        };

    function addTokenToChannel(){
        sequence().then(function(next){
            self.get('petrucci', channel).then(function(existing){
                if (existing === null){
                    return next(petrucci);
                }
                petrucci = existing;
                petrucci.tokens.push(token);
                next(petrucci);
            });
        }).then(function(next){
            q = self
                .insert('petrucci', channel)
                .set(petrucci);
            q.commit().then(function(){
                self.emit('subscribe', channel);
                next();
            }, d.reject);
        }).then(function(next){
            d.resolve(petrucci);
        });
    }
    addTokenToChannel();
    return d.promise;
};

Petrucci.addNewSongs = function(tokens, newSongs){
    var d = when.defer(),
        url = common.getShuffleUrl() + '/new_songs',
        self = this;
    request
        .post(url)
        .type('json')
        .send({
            'tokens': tokens,
            'new_songs': newSongs
        })
        .end(function(res){
            if (res.statusCode !== 200){
                return d.reject();
            }
            self.emit('newSongs', {
                'tokens': tokens,
                'new_songs': newSongs
            });
            return d.resolve();
        });
    return d.promise;
};

Petrucci.destroy = function(channel){
    var d = when.defer();
    this.get('petrucci', channel).then(function(petrucci){
        if(!petrucci){
            return d.reject();
        }
        this.batch()
            .remove('petrucci', channel)
            .commit()
            .then(function(){
                d.resolve();
            }, d.reject);
    }.bind(this), d.reject);
    return d.promise;
};

module.exports = exports = Petrucci;
