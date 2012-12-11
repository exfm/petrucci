"use strict";

var Petrucci = require('./model'),
	when = require('when'),
	sequence = require('sequence'),
	request = require('superagent'),
	common = require('./common');

var watcher,
	error = common.error;

function startWatcher(){
	watcher = setInterval(function(){
		genreWatcher();
	}, 86400000);
}

function genreWatcher(){
	// get all the genres
	// for each genre in genres:
	//  get tokens
	//  for each token in tokens:
	//   hit shuffle api to find last new songs timestamp added for token
	//   use cloudsearch to get all loves from last new songs timestamp to now
	//   send new songs to shuffle for this token
	sequence().then(function(next){
		getGenres().then(next, error);
	}).then(function(next, genres){
		when.all(genres.map(function(genre){
			var p = when.defer();
			Petrucci.getTokens('genre:' + genre).then(function(pt){
				getNewSongs(genre, pt.tokens).then(p.resolve, p.reject);
			}, p.reject);
			return p.promise;
		})).then(next, error);
	});
}

function getNewSongs(genre, tokens){
	var d = when.defer();
	when.all(tokens.map(function(token){
		var p = when.defer(),
			timestamp;
		sequence().then(function(next){
			getLastNewSongs(token).then(next, error);
		}).then(function(next, lastNewSongs){
			timestamp = lastNewSongs.getTime()/1000;
			getRecentLoves(genre, timestamp).then(next, error);
		}).then(function(next, newSongs){
			Petrucci.addNewSongs([token], newSongs).then(p.resolve, p.reject);
		});
		return p.promise;
	})).then(d.resolve, d.reject);
	return d.promise;
}

function watchGenre(genre){
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
}

function getGenres(){
	var d = when.defer();
	Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json').then(function(res){
		d.resolve(JSON.parse(res.body));
	}, d.reject);
	return d.promise;
}

function getRecentLoves(genre, beginTimestamp, s){
	var d = when.defer(),
		size = s || 100,
		url = "http://search-song-3z775eq4lj2c6gdq2gwqxlq7zy.us-east-1.cloudsearch.amazonaws.com" +
		"/2011-02-01/search?bq=(and%20(filter%20last_loved%20" + beginTimestamp +"..)%20(field%20tags%20'" + genre + "'" +
		"))&return-fields=id%2Clast_loved%2Cloved_count%2Ctext_relevance&size=" + size,
		recentLoves = [];
	request
		.get(url)
		.end(function(res){
			if (res.statusCode !== 200){
				return d.reject();
			}
			res.body.hits.hit.map(function(result){
				recentLoves.push(result.data.id[0]);
			});
			return d.resolve(recentLoves);
		});
	return d.promise;
}

function getLastNewSongs(token){
	var d = when.defer(),
		shuffleUrl = common.getShuffleUrl();
	request
		.get(shuffleUrl + '/' + token + '/last-new-songs')
		.end(function(res){
			if (res.statusCode !== 200) {
				return d.reject(new Error(res.statusCode));
			}
			return d.resolve(new Date(res.body.last_new_songs));
		});
	return d.promise;
}

module.exports = {
	'watchGenre': watchGenre,
	'getGenres': getGenres,
	'getRecentLoves': getRecentLoves,
	'startWatcher': startWatcher,
	'getLastNewSongs': getLastNewSongs
};