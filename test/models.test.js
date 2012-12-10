"use strict";

var assert = require("assert"),
    when = require("when"),
    sequence = require("sequence"),
    crypto = require("crypto"),
    _ = require("underscore"),
    magneto = require('magneto'),
    helpers = require("./helpers"),
    redis = require("redis");

var Petrucci = helpers.covRequire("../lib/model"),
    common = require("../lib/common"),
    redisBridge = require('../lib/redisbridge'),
    genreWatcher = require('../lib/genrewatcher');


describe("Model", function(){
    magneto.server = null;

    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
    });

    afterEach(function(done){
        helpers.teardown(done);
    });

    it("should subscribe to a playset by token", function(done){
        var token = 'nonexistantuser:user:totallyarealuser:0',
            id = common.getIdFromToken(token),
            redis_client = redis.createClient(redisInfo.port, redisInfo.host),
            subscribeCallback;
        helpers.petrucciIds.push(id);
        subscribeCallback = function(identifier){
            assert.equal(id, identifier);
            done();
        };
        helpers.listeners.push({
            'event': 'subscribe',
            'callback': subscribeCallback
        });
        Petrucci.on('subscribe', subscribeCallback);
        Petrucci.subscribeToPlayset(token).then(function(petrucci){

        }, function(){
            throw new Error('Unable to subscribe to playset');
        });
    });

    it("should get subscribed tokens for an id", function(done){
        var token = 'grmnygrmny:user:dan:0',
            id = common.getIdFromToken(token);

        helpers.petrucciIds.push(id);
        sequence(this).then(function(next){
            Petrucci.subscribeToPlayset(token).then(next);
        }).then(function(next, petrucci){
            Petrucci.getTokens(id).then(function(p){
                assert.deepEqual([token], p.tokens);
                done();
            }, function(){
                throw new Error('Unable to subscribe to channel');
            });
        });
    });

    it("should unsubscribe a token from an id", function(done){
        var token = 'grmnygrmny:user:dan:0',
            id = common.getIdFromToken(token);

        helpers.petrucciIds.push(id);
        sequence(this).then(function(next){
            Petrucci.subscribeToPlayset(token).then(next);
        }).then(function(next, petrucci){
            Petrucci.unsubscribeFromPlayset(token).then(next, function(){
                throw new Error('Unable to unsubscribe from channel');
            });
        }).then(function(next){
            Petrucci.getTokens(id).then(function(p){
                helpers.petrucciIds.splice(helpers.petrucciIds.indexOf(id), 1);
                done();
            }, function(){
                throw new Error();
            });
        });
    });

    it("should add new songs to shuffle via the shuffle api", function(done){
        var tokens = [
                'grmnygrmny:user:dan:0',
                'grmnygrmny:user:jm:0',
                'grmnygrmny:user:majman:0'
            ], newSongs = [
                18073540,
                38474140,
                33285435
            ],
            newSongsCallback;

        newSongsCallback = function(nS){
            assert.deepEqual(tokens, nS.tokens);
            assert.deepEqual(newSongs, nS.new_songs);
            done();
        };
        helpers.listeners.push({
            'event': 'newSongs',
            'callback': newSongsCallback
        });
        Petrucci.on('newSongs', newSongsCallback);
        Petrucci.addNewSongs(tokens, newSongs);
    });

    // this is already done in API
    // it("should subscribe to a playset and add new songs to shuffle via shuffle api", function(done){
    //     var token = 'totallyarealuser:user:someotheruser:0',
    //         channel = common.getChannel(token),
    //         newSongs = [
    //             18073540,
    //             38474140,
    //             33285435
    //         ],
    //         newSongsBase36 = [],
    //         redis_client = redis.createClient(redisInfo.port, redisInfo.host),
    //         newSongsCallback;

    //     newSongs.map(function(s){
    //         newSongsBase36.push(common.base36encode(s));
    //     });

    //     newSongsCallback = function(nS){
    //         assert.deepEqual([token], nS.tokens);
    //         assert.deepEqual(newSongs, nS.new_songs);
    //         done();
    //     };
    //     Petrucci.on('newSongs', newSongsCallback);
    //     helpers.listeners.push({
    //         'event': 'newSongs',
    //         'callback': newSongsCallback
    //     });
    //     helpers.petrucciChannels.push(channel);
    //     Petrucci.subscribeToPlayset(token).then(function(){
    //         redis_client.publish(channel, JSON.stringify(newSongsBase36));
    //     }, function(){
    //         throw new Error();
    //     });
    // });

});

describe("Redis Bridge", function(){
    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
        redisBridge.connect(redisInfo.host, redisInfo.port, 0);
    });

    after(function(done){
        helpers.teardown(done);
    });

    it("should subscribe to a channel", function(done){
        var redis_client = redis.createClient(redisInfo.port, redisInfo.host);
        done();
    });
});

describe("GenreWatcher", function(){
    before(function(done){
        helpers.setup(done);
    });

    afterEach(function(done){
        helpers.teardown(done);
    });

    it("should be watching a genre", function(done){
        genreWatcher.subscribe('heatwave').then(function(genres){
            assert.notEqual(genres.indexOf('heatwave'), -1);
            done();
        });
    });

    it("should get list of genres", function(done){
        genreWatcher.getGenres().then(function(genres){
            assert.notEqual(genres.indexOf('heatwave'), -1);
            done();
        });
    });
});