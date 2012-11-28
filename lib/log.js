var winston = require('winston'),
    config = {
        'console': {
            'level': "silly",
            'timestamp': true,
            'colorize': true
        }
    };

if(process.env.NODE_ENV === "testing"){
    config = {
        'file': {
            'level': "silly",
            'filename': 'app.log'
        }
    };
}

module.exports = winston.loggers.add("app", config);