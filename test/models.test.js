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
    redisBridge = require('../lib/redisbridge');


describe("Model", function(){
    // magneto.server = null;

    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
        redisBridge.connect(redisInfo.host, redisInfo.port, 0);
    });

    after(function(done){
        helpers.teardown(done);
    });

    it("should subscribe to a playset by token", function(done){
        var token = 'grmnygrmny:user:dan:0';
        Petrucci.subscribeToPlayset(token).then(function(petrucci){
            console.log(petrucci);
            done();
        }, assert.fail);
    });

    it("should get subscribed tokens for a channel", function(done){
        var token = 'grmnygrmny:user:dan:0',
            channel = 'dan:loved';
        sequence(this).then(function(next){
            Petrucci.subscribeToPlayset(token).then(next);
        }).then(function(next, petrucci){
            console.log(petrucci);
            Petrucci.getTokens(channel).then(function(petrucci){
                assert.deepEqual([token], petrucci.tokens);
                done();
            }, assert.fail);
        });

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