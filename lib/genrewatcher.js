"use strict";

var Petrucci = require('./model'),
	when = require('when');

module.exports.subscribe = function(){
	var d = when.defer();

	return d.promise;
};

module.exports.getGenres = function(){
	return Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json');
};

//bucket, key, content