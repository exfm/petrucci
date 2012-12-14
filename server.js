"use strict";

var app = require('./'),
    Petrucci = app.model,
    http = require('http'),
    nconf = require('nconf'),
    winston = require('winston'),
    getConfig = require('junto'),
    aws = require('plata'),
    plog = require('plog'),
    common = require('./lib/common');

nconf
    .argv()
    .env()
    .use("memory");

nconf.defaults({
    'port': 8080,
    'host': "0.0.0.0",
    'logging': {
        'console': {
            'level': "silly",
            'timestamp': true,
            'colorize': true
        }
    }
});

getConfig(nconf.get("NODE_ENV")).then(function(config){
    nconf.overrides(config);

    // Setup the model level
    app.model.connect(nconf.get("aws:key"), nconf.get("aws:secret"),
        nconf.get("table_prefix"));

    // Connect plata
    app.model.aws.connect({
        'key': nconf.get("aws:key"),
        'secret': nconf.get("aws:secret")
    });

    // plog
    //     .find(/^petrucci/)
    //     .file(process.env.PWD + '/logs/petrucci.log')
    //     .remove('console')
    //     .level('silly');

    if(nconf.get('MAMBO_BACKEND')){
        Petrucci.createAll().then(function(){
            console.log('All tables created in magneto');
        });
    }
    app.connectRedis().then(function(){
        app.listen(nconf.get('port'), nconf.get('host'));
        console.log('listening on ' + nconf.get('host') + ':' + nconf.get('port')); // @todo log.info
    });
});

// var server = http.createServer(app);
// app.server = server;

