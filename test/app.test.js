"use strict";

var Petrucci = require('../lib/model'),
    helpers = require("./helpers"),
    sequence = require("sequence"),
    when = require("when"),
    assert = require("assert"),
    request = require("superagent"),
    magneto = require("magneto"),
    util = require('util'),
    redis = require('redis'),
    common = require('../lib/common'),
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
    magneto.server = null;

    var redisInfo = helpers.getRedisInfo();

    before(function(done){
        helpers.setup(done);
    });

    afterEach(function(done){
        helpers.teardown(done);
    });

    it("should subscribe to a playset and add new songs to shuffle via shuffle api", function(done){
        var token = 'totallyarealuser:user:someotheruser:0',
            id = common.getIdFromToken(token),
            newSongObject = {
                'song_ids': [
                    18073540,
                    38474140,
                    33285435
                ]
            },
            redis_client = redis.createClient(redisInfo.port, redisInfo.host),
            newSongsCallback;

        newSongsCallback = function(nS){
            assert.deepEqual([token], nS.tokens);
            assert.deepEqual(newSongObject.song_ids, nS.new_songs);
            done();
        };
        Petrucci.on('newSongs', newSongsCallback);
        helpers.listeners.push({
            'event': 'newSongs',
            'callback': newSongsCallback
        });
        helpers.petrucciIds.push(id);

        request
            .post(baseUrl + '/')
            .type('json')
            .send({
                'token': token
            })
            .end(function(res){
                if (res.statusCode !== 200){
                    throw new Error(res.body);
                }
                return redis_client.publish(common.getRedisChannelFromId(id), JSON.stringify(newSongObject));
            });
    });

    it("should subscribe and unsubscribe from a playset", function(done){
        var token = 'grmnygrmny:user:dan:0',
            id = common.getIdFromToken(token);

        helpers.petrucciIds.push(id);
        sequence(this).then(function(next){
            Petrucci.subscribeToPlayset(token).then(next);
        }).then(function(next, petrucci){
            request
            .post(baseUrl + '/unsubscribe')
            .type('json')
            .send({
                'token': token
            })
            .end(function(res){
                if (res.statusCode !== 200){
                    throw new Error(res.body);
                }
                Petrucci.getTokens(id).then(function(p){
                    helpers.petrucciIds.splice(helpers.petrucciIds.indexOf(id), 1);
                    done();
                }, function(){
                    throw new Error();
                });
            });
        });
    });
});