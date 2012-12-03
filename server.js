"use strict";

var app = require('./'),
    Petrucci = app.model,
    http = require('http'),
    nconf = require('nconf'),
    winston = require('winston'),
    getConfig = require('junto'),
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

    // Update logger with remote settings.
    app.log = winston.loggers.add("app", nconf.get('logging'));

    // Setup the model level
    app.model.connect(nconf.get("aws:key"), nconf.get("aws:secret"),
        nconf.get("table_prefix"));

    if(nconf.get('MAMBO_BACKEND')){
        Petrucci.createAll().then(function(){
            console.log('All tables created in magneto');
        });
    }
    app.connectRedis();
});



var server = http.createServer(app);
app.server = server;

module.exports = server;
module.exports.nconf = nconf;

// @todo (lucas) Listen for config changes