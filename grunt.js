"use strict";

var child_process = require("child_process"),
    path = require("path"),
    fs = require("fs"),
    sequence = require("sequence"),
    when = require("when");

module.exports = function(grunt){
    // Project configuration.
    grunt.initConfig({
        'lint': {
            'all': [
                "grunt.js",
                "lib/**/*.js",
                "test/**/*.js"
            ]
        },
        'jshint': {
            'options': {
                'node': true
            }
        }
    });

    grunt.registerTask("test", function(){
        var done = this.async();
        grunt.helper("jscoverage").then(function(){
            child_process.exec(
                "COVERAGE=1 mocha --reporter html-cov > coverage.html",
                {
                    'COVERAGE': 1,
                    'NODE_ENVIRONMENT': "testing"
                },
                function(err, stdout, stderr) {
                if(err){
                    grunt.warn(err);
                }
                done();
            });
        });
    });

    grunt.registerTask("jenkins", function(){
        var magneto,
            env,
            mocha,
            jshint,
            done = this.async();

        magneto = grunt.utils.spawn({
            'cmd': "magneto",
            'args': ["8888"]
        });
        env = grunt.utils._.extend(process.env, {
            'JENKINS': 1,
            'MAGNETO_PORT': 8888
        });

        mocha = grunt.utils.spawn({
            'cmd': "mocha",
            'args': ["-R", "xunit"],
            'opts': {
                'env': env
            }
        }, function(error, result, code){
            fs.writeFileSync("xunit.xml", result.stdout);
            jshint = grunt.utils.spawn({
                'cmd': "jshint",
                'args': [
                    "./lib",
                    "./test",
                    "--jslint-reporter"
                ]
            }, function(error, result, code){
                fs.writeFileSync("jshint.xml", result.stdout);
                magneto.kill();
                done();
            });
        });
    });

    grunt.registerHelper("jscoverage", function(){
        var d = when.defer();
        sequence(this)
            .then(function(next){
                path.exists(path.resolve("./lib-cov"), next);
            })
            .then(function(next, exists){
                if(exists){
                    return fs.rmdir(path.resolve("./lib-cov"), next);
                }
                return next();
            })
            .then(function(next){
                child_process.exec(
                    "jscoverage --no-highlight ./lib ./lib-cov",
                    function(err, stdout, stderr) {
                    d.resolve();
                });
            });
        return d.promise;
    });

    grunt.registerTask("default", "lint test");

};