"use strict";

var helpers = require("./helpers"),
    sequence = require("sequence"),
    when = require("when"),
    assert = require("assert"),
    request = require("superagent"),
    util = require('util'),
    child_process = require('child_process'),
    path = require('path');

function pluck(list, key){
    return list.map(function(l){
        return l[key];
    });
}

var server,
    host = "0.0.0.0",
    port = 3001,
    baseUrl = "http://" + host + ":" + port;

function post(path){
    path = path || '/';
    return request.post(baseUrl + path);
}

function get(path){
    path = path || '/';
    return request.get(baseUrl + path);
}

describe("API", function(){
    before(function(done){
        helpers.setup(done);
    });

    after(function(done){
        helpers.teardown(done);
    });

    describe("create", function(){
        it("should create a node-petrucci", function(done){
            post('/')
                .send({'title': "a title"})
                .end(function(res){
                    assert.equal(200, res.status);
                    assert.equal("a title", res.body.title);
                    done();
            });
        });
    });

    describe("get", function(){
        var node-petrucci;
        before(function(done){
            helpers.createNode-petrucci().then(function(data){
                node-petrucci = data;
                done();
            });
        });
        it("should get a node-petrucci by id", function(done){
            get("/" + node-petrucci.id)
                .end(function(res){
                    assert.equal(200, res.status);
                    assert.equal(node-petrucci.title, res.body.title);
                    done();
                });
        });
    });
});
