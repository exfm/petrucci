"use strict";

var Petrucci = require('./model'),
    redis = require('redis'),
    util = require('util'),
    leveldb = require('leveldb'),
    when = require('when'),
    nconf = require('nconf'),
    sequence = require('sequence'),
    common = require('./common'),
    exec = require('child_process').exec,
    fs = require('fs'),
    plog = require('plog'),
    log = plog('petrucci.redisbridge'),
    host, port, db, redis_client, subscriptionsDb,
    connected = false;


// subscriptionsDb is the global handle to leveldb.
// This database is the on-disk persistance of subscribed redis channels.
// If subscriptions.db is present on Petrucci start, the saved channels will be loaded.
// If it does not exist, a backup will attempt to pulled from S3.  If this fails,
// a local copy will be created.
// After loading (and in production), a backup task is started that will tar/gzip
// the local subscriptions.db and put it into S3 every hour.

// Begin the hourly setInterval redis subscriptions backup task.
// @todo SQS instead?
function startSubscriptionsBackup(){
    var backupTask = setInterval(function(){
        backupSubscriptions().then(function(){
            log.info('subscriptions successfully backed up to S3');
        }, function(err){
            log.error('there was an error uploading subscription backup to S3: ' + err);
        });
    }, 60*60*1000);
}

// Executed on startup.  This will try to load redis subscriptions from local leveldb database.
// If the database is missing, load a backup from S3, gunzip it and load it with leveldb
function loadSubscriptions(){
    var d = when.defer();
    sequence().then(function(next){
        leveldb.open(process.env.PWD + '/subscriptions.db', {
            'create_if_missing': false
        }, function(err, data){
            if (err){
                return loadSubscriptionsBackup().then(next, function(){
                    createSubscriptionsDatabase().then(next, common.error);
                });
            }
            return next(data);
        });
    }).then(function(next, data){
        subscriptionsDb = data;
        getAllSubscriptions(data).then(next, common.error);
    }).then(function(next, subscriptions){
        if (process.env.NODE_ENV === 'production'){
            startSubscriptionsBackup();
            log.info('starting subscription backup task');
        }
        d.resolve(subscriptions);
    });
    return d.promise;
}

// WORKS
function loadSubscriptionsBackup(){
    var d = when.defer();
    sequence().then(function(next){
        Petrucci.aws.s3.get('petrucci.extension.fm', 'subscriptionsBackup.tar.gz').then(function(res){
            if (res.statusCode !== 200){
                return d.reject();
            }
            return next(res.body);
        }, d.reject);
    }).then(function(next, data){
        fs.writeFile(process.env.PWD + '/subscriptionsBackup.tar.gz', data, 'binary', function(err){
            if (err){
                return d.reject();
            }
            next();
        });
    }).then(function(next){
        exec('tar -xf subscriptionsBackup.tar.gz', function(err, stdout, stderr){
            if (err !== null){
                return d.reject();
            }
            return next();
        });
    }).then(function(next){
        leveldb.open(process.env.PWD + '/subscriptions.db', {
            'create_if_missing': false
        }, function(err, data){
            if (err){
                return d.reject(err);
            }
            return d.resolve(data);
        });
    });
    return d.promise;
}

// WORKS
function getAllSubscriptions(data){
    var d = when.defer(),
        items = [];
    data.iterator({}, function(err, it){
        it.forRange(function(err, key, value){
            items.push(key);
        }, function(){
            d.resolve(items);
        });
    });
    return d.promise;
}

// WORKS
function backupSubscriptions(){
    var d = when.defer();
    sequence().then(function(next){
        exec('tar -czf subscriptionsBackup.tar.gz subscriptions.db/',
            function(err, stdout, stderr){
                if (err !== null){
                    return d.reject(new Error(err));
                }
                return next(process.env.PWD + '/subscriptionsBackup.tar.gz');
        });
    }).then(function(next, filename){
        fs.readFile(filename, function(err, data){
            if (err){
                return d.reject(new Error(err));
            }
            return next(data);
        });
    }).then(function(next, backup){
        Petrucci.aws.s3.put('petrucci.extension.fm', 'subscriptionsBackup.tar.gz', backup).then(function(res){
            if (res.statusCode !== 200){
                return d.reject();
            }
            return d.resolve();
        }, d.reject);
    });
    return d.promise;
}

// WORKS
function createSubscriptionsDatabase(){
    var d = when.defer();
    // @todo - can't call .open more than once?
    leveldb.open(process.env.PWD + '/subscriptions.db', {
        'create_if_missing': true
    }, function(err, data){
        if (err){
            return d.reject(err);
        }
        return d.resolve(data);
    });
    return d.promise;
}

module.exports.connect = function(host, port, db){
    var d = when.defer();
    sequence().then(function(next){
        redis_client = redis.createClient(port, host);
        redis_client.on('error', function(err){
            throw new Error(err);
        });
        redis_client.on('message', onMessage);
        redis_client.select(db);
        connected = true;
        log.info('redis connected');
        next();
    }).then(function(next){
        loadSubscriptions().then(next, common.error);
    }).then(function(next, data){
        when.all(data.map(function(sub){
            var d = when.defer();
                module.exports.subscribe(sub).then(d.resolve, common.error);
            return d.promise;
        })).then(function(){
            log.info('subscriptions loaded');
            return d.resolve();
        }, common.error);
    });
    return d.promise;
};

// Callback executed when a message is recieved from the redis connect.
// Get all of the associated tokens with this channel (be it user or site)
// and send the new base10 IDs and tokens to Petrucci's addNewSongs
function onMessage(redisChannel, message){
    var songs = [],
        data;
    Petrucci.getTokens(common.getIdFromRedisChannel(redisChannel)).then(
        function(petrucci){
            data = JSON.parse(message);
            if (data.hasOwnProperty('song_ids')){
                data.song_ids.map(function(song){
                    songs.push(song);
                });
            }
            else {
                songs.push(data.id);
            }
            Petrucci.addNewSongs(petrucci.tokens, songs);
        }, function(err){
            throw new Error(err);
        }
    );
}

module.exports.subscribe = function(redisChannel){
    var d = when.defer();
    redis_client.send_command("subscribe", [redisChannel], function(data){
        subscriptionsDb.put(redisChannel, new Date(), function(err){
            log.silly('subscribed to channel ' + redisChannel);
            d.resolve();
        });
    });
    return d.promise;
};

module.exports.unsubscribe = function(redisChannel){
    var d = when.defer();
    redis_client.send_command("unsubscribe", [redisChannel], function(data){
        subscriptionsDb.del(redisChannel);
        d.resolve();
    });
    return d.promise;
};

