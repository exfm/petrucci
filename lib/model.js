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
    Shuffle = require("shuffle"),
    redisBridge = require('./redisBridge'),

    common = require("./common"),
    Options = common.Options;

function getChannel(token){
    var unpacked = common.unpackToken(token),
        channelMap = {
            'user': unpacked.playsetId + ':loved',
            'site': 'site:' + unpacked.playsetId + ':songs_added'
        };
    return channelMap[unpacked.playsetType];
}

var petrucciSchema = new Schema('Petrucci', 'petrucci', 'channel', {
    'channel': StringField,
    'tokens': JSONField,
    'created': DateField
});

var Petrucci = new Model(petrucciSchema);

Petrucci.getTokens = function(channel){
    return this.get("petrucci", channel);
};

Petrucci.subscribeToPlayset = function(token){
    var q,
        self = this,
        d = when.defer(),
        created = new Date(),
        channel = getChannel(token),
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
                // return redisBridge.subscribe(channel);
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
        url = common.getShuffleUrl() + '/new_songs';
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
            return d.resolve();
        });
    return d.promise;
};

Petrucci.destroy = function(channel){
    var d = when.defer();
    this.get('petrucci', channel).then(function(petrucci){
        if(!petrucci){
            return d.resolve(false);
        }
        this.batch()
            .remove('petrucci', channel)
            .commit()
            .then(function(){d.resolve(true);}, d.reject);
    }.bind(this), d.reject);
    return d.promise;
};

module.exports = exports = Petrucci;
