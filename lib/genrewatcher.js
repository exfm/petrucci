// GenreWatcher
// Polls CloudSearch to get new songs for a Genre-type shuffle playset.

"use strict";

var Petrucci = require('./model'),
	when = require('when'),
	sequence = require('sequence'),
	request = require('superagent'),
	common = require('./common'),
	log = require('plog')('petrucci.genrewatcher');

var watcher,
	error = common.error;

function startWatcher(){
	watcher = setInterval(function(){
		genreWatcher();
	}, 24*60*60*1000);
}

// Get all watched genres.
// With each watched genre, get all of the tokens that are watching this genre.
// Use CloudSearch to grab all of the new songs for this playset since the last time
// this playset was updated for this token.
function genreWatcher(){
	sequence().then(function(next){
		getGenres().then(next, error);
	}).then(function(next, genres){
		when.all(genres.map(function(genre){
			var p = when.defer();
			Petrucci.getById('genre:' + genre).then(function(pt){
				if (pt === null){
					return p.resolve();
				}
				return getNewSongs(genre, pt.tokens).then(p.resolve, p.reject);
			}, p.reject);
			return p.promise;
		})).then(function(){
			log.silly('pushed new songs to genre tokens');
		}, error);
	});
}

// Get new Genre playset songs for an array of tokens.
// This hits shuffle to find out the last time new songs were added for this token
// and sends to CloudSearch to find the new songs from that timestamp to now
// (sorted by recent loves)
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

// Get the genres we're watching from S3, add our genre to this list, and put
// it back into S3.
// THIS IS PRETTY BAD and should be moved into the same leveldb database as redisbridge
// (lots of potential for race cases and such)
function watchGenre(genre){
	var d = when.defer();
	sequence().then(function(next){
		Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json').then(function(res){
			next(JSON.parse(res.body));
		}, function(){
			next([]);
		});
	}).then(function(next, genres){
		// if it's already in there, don't do anything, just resolve
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

// Get the list of genres we are watching from S3
// Again, this should be switched to LevelDB instead.
function getGenres(){
	var d = when.defer();
	Petrucci.aws.s3.get('petrucci.extension.fm', 'genresToWatch.json').then(function(res){
		d.resolve(JSON.parse(res.body));
	}, d.reject);
	return d.promise;
}

// Use CloudSearch to get recent loved songs for a genre, from a given timestamp to now.
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

// Hit shuffle's API to find the last time new songs were added to this playset
// (used to send to CloudSearch)
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
	'getLastNewSongs': getLastNewSongs,
	'genreWatcher': genreWatcher
};