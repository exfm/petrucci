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
    aws = require('plata'),
    plog = require("plog"),
    log = plog('petrucci.model'),
    events = require('events'),
    util = require('util'),

    common = require("./common"),
    Options = common.Options;

var petrucciSchema = new Schema('Petrucci', 'petrucci', 'id', {
    'id': StringField,
    'tokens': JSONField,
    'created': DateField
});

// @todo switch this to hash-range
//  add last time something was added?

var Petrucci = new Model(petrucciSchema);
util.inherits(Petrucci, events.EventEmitter);

// This is plata and is used for S3 storage accessing in RedisBridge and GenreWatcher
Petrucci.aws = aws;

// Get a Petrucci object by its id
Petrucci.getById = function(id){
    return this.get("petrucci", id);
};

// Subscribe to a playset type by token.
// This puts the token into the Dynamo row for this Petrucci ID
// and emits a 'subscribe' event, which is caught and sent to either RedisBridge
// or GenreWatcher.
// Currently the event handler for this is in app.js, but it should be moved elsewhere.
Petrucci.subscribeToPlayset = function(token){
    log.silly('subscribing to playset for token ' + token);
    var q,
        self = this,
        d = when.defer(),
        id = common.getIdFromToken(token),
        created = new Date(),
        petrucci = {
            'id': id,
            'tokens': [token],
            'created': created
        };

    // @todo update vs insert
    function addTokenToId(){
        sequence().then(function(next){
            self.get('petrucci', id).then(function(existing){
                if (existing === null){
                    return next(petrucci);
                }
                petrucci = existing;
                if (petrucci.tokens.indexOf(token) === -1){
                    petrucci.tokens.push(token);
                }
                next(petrucci);
            });
        }).then(function(next){
            q = self
                .insert('petrucci', id)
                .set(petrucci);
            q.commit().then(function(){
                self.emit('subscribe', id);
                next();
            }, d.reject);
        }).then(function(next){
            d.resolve(petrucci);
        });
    }
    addTokenToId();
    return d.promise;
};

// Only really used in testing.
Petrucci.unsubscribeFromPlayset = function(token){
    var q,
        self = this,
        d = when.defer(),
        id = common.getIdFromToken(token);

    function removeTokenFromId(){
        sequence().then(function(next){
            self.get('petrucci', id).then(function(existing){
                if (existing === null){
                    return d.reject(new Error('Token does not exist for this id.'));
                }
                if (_.isEqual(existing.tokens, [token])){
                    // if this is the only token in the id, destory the id
                    return d.resolve(self.destroy(id));
                }
                existing.tokens.splice(existing.tokens.indexOf(token), 1);
                next(existing);
            });
        }).then(function(next, petrucci){
            q = self
                .insert('petrucci', id)
                .set(petrucci);
            q.commit().then(function(){
                self.emit('unsubscribe', id);
                next();
            }, d.reject);
        }).then(function(next){
            d.resolve();
        });
    }
    removeTokenFromId();
    return d.promise;
};

// This is the function that actually collects new songs for an array of tokens
// and actually submits them to shuffle.
// In testing, this hits a fauxfm shuffle API that duplicates the response.
// In production, the production shuffle URL is pulled from the config using
// Junto.
Petrucci.addNewSongs = function(tokens, newSongs){
    log.silly('adding songs ' + newSongs + ' to tokens ' + tokens);
    var d = when.defer(),
        url = common.getShuffleUrl() + '/new-songs',
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
            log.silly('successfully added new songs');
            self.emit('newSongs', {
                'tokens': tokens,
                'new_songs': newSongs
            });
            return d.resolve();
        });
    return d.promise;
};

// Only used in testing.  Destroy a Petrucci object.
Petrucci.destroy = function(id){
    var d = when.defer();
    this.get('petrucci', id).then(function(petrucci){
        if(!petrucci){
            return d.reject();
        }
        this.batch()
            .remove('petrucci', id)
            .commit()
            .then(function(){
                d.resolve();
            }, d.reject);
    }.bind(this), d.reject);
    return d.promise;
};

module.exports = exports = Petrucci;
