"use strict";

var Petrucci = require('./model'),
	when = require('when'),
	sequence = require('sequence');

module.exports.subscribe = function(genre){
	var d = when.defer();
	sequence().then(function(next){
		Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json').then(function(res){
			next(JSON.parse(res.body));
		}, function(){
			next([]);
		});
	}).then(function(next, genres){
		if (genres.indexOf(genre) === -1){
			genres.push(genre);
			return Petrucci.aws.s3.put('petrucci.extension.fm', 'genresToWatch.json', JSON.stringify(genres), {
				'Content-Type': 'application/JSON'
			}).then(function(res){
				if (res.statusCode !== 200){
					return d.reject(new Error('Unable to put genres in s3'));
				}
				return d.resolve(genres);
			});
		}
		else {
			return d.resolve(genres);
		}

	});
	return d.promise;
};

module.exports.getGenres = function(){
	return Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json');
};

module.exports.exists = function(){
	return Petrucci.aws.s3.exists('petrucci.extension.fm', 'genresToWatch.json');
};

//bucket, key, content