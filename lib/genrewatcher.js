"use strict";

var Petrucci = require('./model'),
	when = require('when'),
	sequence = require('sequence'),
	request = require('superagent');

var watcher = setInterval(function(){
	// get all the genres
	// for each genre in genres:
	//  get tokens
	//  for each token in tokens:
	//   hit shuffle api to find last new songs timestamp added for token
	//   use cloudsearch to get all loves from last new songs timestamp to now
	//   send new songs to shuffle for this token

}, 86400000);

module.exports.watchGenre = function(genre){
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
	var d = when.defer();
	Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json').then(function(res){
		d.resolve(JSON.parse(res.body));
	}, d.reject);
	return d.promise;
};

module.exports.getRecentLoves = function(genre, beginTimestamp){
	var url = "http://search-song-3z775eq4lj2c6gdq2gwqxlq7zy.us-east-1.cloudsearch.amazonaws.com" +
		"/2011-02-01/search?bq=(and%20(filter%20last_loved%20" + beginTimestamp +"..)%20(field%20tags%20'" + genre + "'" +
		"))&return-fields=id%2Clast_loved%2Cloved_count%2Ctext_relevance";
	request
		.get(url)
		.end(function(res){
			console.log(res.body);
		});
};


// id%2Clast_loved%2Cloved_count%2Ctext_relevance


//bucket, key, content