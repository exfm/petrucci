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
    magneto.server = null;

    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
    });

    after(function(done){
        helpers.teardown(done);
    });

    it("should subscribe to a playset by token", function(done){
        var token = 'grmnygrmny:user:dan:0';
        Petrucci.subscribeToPlayset(token).then(function(petrucci){
            console.log(petrucci);
            done();
        }, done);
    });

    // describe("get", function(){
    //     it("should get a petrucci", function(done){
    //         sequence(this).then(function(next){
    //             helpers.createPetrucci().then(next, assert.fail);
    //         }).then(function(next, s){
    //             helpers.petrucciIds.push(s.id);
    //             Petrucci.get("petrucci", s.id).then(function(data){
    //                 assert.equal(s.title, data.title);
    //                 done();
    //             }, assert.fail);
    //         });
    //     });

    //     it("should get a petrucci by id", function(done){
    //         var title = "this is a title";
    //         sequence(this).then(function(next){
    //             helpers.createPetrucci({'title': title}).then(next);
    //         }).then(function(next, s){
    //             Petrucci.getById(s.id).then(function(s){
    //                 assert.equal(title, s.title);
    //                 done();
    //             });
    //         });
    //     });
    // });

    // describe("create", function(){
    //     it("should create create a petrucci", function(done){
    //         var title = "this is a title";
    //         sequence(this).then(function(next){
    //             helpers.createPetrucci({'title': title}).then(next);
    //         }).then(function(next, s){
    //             Petrucci.getById(s.id).then(function(petrucci){
    //                 next(petrucci);
    //             });
    //         }).then(function(next, petrucci){
    //             assert.equal(petrucci.title, title);
    //             done();
    //         });
    //     });
    // });

    // describe("update", function(){
    //     it("should update stuff", function(done){
    //         var title = "this is a title",
    //             id;
    //         sequence(this).then(function(next){
    //             helpers.createPetrucci({
    //                 'title': title
    //             }).then(next);
    //         }).then(function(next, s){
    //             id = s.id;
    //             Petrucci.update('petrucci', s.id).set({
    //                 'title': 'this is a new title'
    //             })
    //             .commit()
    //             .then(next);
    //         }).then(function(next){
    //             Petrucci.getById(id).then(next);
    //         }).then(function(next, petrucci){
    //             assert.equal('this is a new title', petrucci.title);
    //             done();
    //         });
    //     });
    // });
});

describe("Redis Bridge", function(){
    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
    });

    after(function(done){
        helpers.teardown(done);
    });

    it("should subscribe to a channel", function(done){
        var redis_client = redis.createClient(redisInfo.port, redisInfo.host);
        redisBridge.connect(redisInfo.host, redisInfo.port, 0);
        done();
    });
});