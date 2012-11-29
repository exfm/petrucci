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
    redisBridge = require('../lib/redisbridge');


describe("Model", function(){
    magneto.server = null;

    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
    });

    afterEach(function(done){
        Petrucci.removeAllListeners('subscribe');
        Petrucci.removeAllListeners('newSongs');
        helpers.teardown(done);
    });

    it("should subscribe to a playset by token", function(done){
        var token = 'nonexistantuser:user:totallyarealuser:0',
            channel = common.getChannel(token),
            redis_client = redis.createClient(redisInfo.port, redisInfo.host);

        helpers.petrucciChannels.push(channel);
        Petrucci.on('subscribe', function(ch){
            assert.equal(channel, ch);
        });
        Petrucci.subscribeToPlayset(token).then(function(petrucci){
            done();
        }, assert.fail);
    });

    it("should get subscribed tokens for a channel", function(done){
        var token = 'grmnygrmny:user:dan:0',
            channel = 'dan:loved';

        helpers.petrucciChannels.push(channel);
        sequence(this).then(function(next){
            Petrucci.subscribeToPlayset(token).then(next);
        }).then(function(next, petrucci){
            Petrucci.getTokens(channel).then(function(p){
                assert.deepEqual([token], p.tokens);
                done();
            }, assert.fail);
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
            ];
        Petrucci.on('newSongs', function(nS){
            assert.deepEqual(tokens, nS.tokens);
            assert.deepEqual(newSongs, nS.new_songs);
            done();
        });
        Petrucci.addNewSongs(tokens, newSongs).then(assert.pass, assert.fail);
    });

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