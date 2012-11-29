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
            },
            'globals': {
                'it': true,
                'describe': true,
                'before': true,
                'after': true,
                'beforeEach': true,
                'afterEach': true
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
        var env,
            mocha,
            jshint,
            done = this.async(),
            packageJson,
            testCode = -1;

        env = grunt.utils._.extend(process.env, {
            'JENKINS': 1,
            'NODE_ENVIRONMENT': "testing"
        });

        function rmNodeModules(dependencies){
            var p, d = when.defer();

            when.all(Object.keys(dependencies).map(function(key){
                if(dependencies[key].indexOf("github.com") !== -1){
                    p = when.defer();
                    child_process.exec("rm -rf node_modules/" + key, function(err, stdout, stderr) {
                        if(err){
                            grunt.warn(err);
                        }
                        p.resolve();
                    });
                }
            }), d.resolve);
            return d.promise;
        }

        sequence(this).then(function(next){
            // Read package.json
            packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

            // Delete dependencies with github source
            rmNodeModules(packageJson.dependencies).then(next);
        }).then(function(next){
            // Delete devDependencies with github source
            rmNodeModules(packageJson.devDependencies).then(next);
        }).then(function(next){
            // Run npm install
            child_process.exec("npm install", function(err, stdout, stderr) {
                if(err){
                    grunt.warn(err);
                }
                next();
            });
        }).then(function(next){
            child_process.exec("rm -f xunit.xml jshint.xml", function(err, stdout, stderr) {
                if(err){
                    grunt.warn(err);
                }
                next();
            });
        }).then(function(next){
            mocha = grunt.utils.spawn(
                {
                    'cmd': "mocha",
                    'args': ["-R", "xunit"],
                    'opts': {
                        'env': env
                    }
                },
                next
            );
        }).then(function(next, error, result, code){
            console.log('Tests passed? ', (code === 0) ? 'yes' : 'no');
            console.log(result.stdout);
            console.error(result.stderr);
            testCode = code;

            // Write test results
            fs.writeFileSync("xunit.xml", result.stdout);

            // Run jshint
            jshint = grunt.utils.spawn(
                {
                    'cmd': "jshint",
                    'args': [
                        "./lib",
                        "./test",
                        "--jslint-reporter"
                    ]
                },
                next
            );
        }).then(function(next, error, result, code){
            fs.writeFileSync("jshint.xml", result.stdout);
            process.exit(testCode);
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