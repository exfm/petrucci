"use strict";

var assert = require("assert"),
    when = require("when"),
    sequence = require("sequence"),
    crypto = require("crypto"),
    _ = require("underscore"),
    magneto = require('magneto'),
    helpers = require("./helpers");

var Node-petrucci = helpers.covRequire("../lib/model");


describe("Model", function(){
    magneto.server = null;

    before(function(done){
        helpers.setup(done);
    });

    afterEach(function(done){
        helpers.teardown(done);
    });
    describe("get", function(){
        it("should get a node-petrucci", function(done){
            sequence(this).then(function(next){
                helpers.createNode-petrucci().then(next, assert.fail);
            }).then(function(next, s){
                helpers.node-petrucciIds.push(s.id);
                Node-petrucci.get("node-petrucci", s.id).then(function(data){
                    assert.equal(s.title, data.title);
                    done();
                }, assert.fail);
            });
        });

        it("should get a node-petrucci by id", function(done){
            var title = "this is a title";
            sequence(this).then(function(next){
                helpers.createNode-petrucci({'title': title}).then(next);
            }).then(function(next, s){
                Node-petrucci.getById(s.id).then(function(s){
                    assert.equal(title, s.title);
                    done();
                });
            });
        });
    });

    describe("create", function(){
        it("should create create a node-petrucci", function(done){
            var title = "this is a title";
            sequence(this).then(function(next){
                helpers.createNode-petrucci({'title': title}).then(next);
            }).then(function(next, s){
                Node-petrucci.getById(s.id).then(function(node-petrucci){
                    next(node-petrucci);
                });
            }).then(function(next, node-petrucci){
                assert.equal(node-petrucci.title, title);
                done();
            });
        });
    });

    describe("update", function(){
        it("should update stuff", function(done){
            var title = "this is a title",
                id;
            sequence(this).then(function(next){
                helpers.createNode-petrucci({
                    'title': title
                }).then(next);
            }).then(function(next, s){
                id = s.id;
                Node-petrucci.update('node-petrucci', s.id).set({
                    'title': 'this is a new title'
                })
                .commit()
                .then(next);
            }).then(function(next){
                Node-petrucci.getById(id).then(next);
            }).then(function(next, node-petrucci){
                assert.equal('this is a new title', node-petrucci.title);
                done();
            });
        });
    });
});