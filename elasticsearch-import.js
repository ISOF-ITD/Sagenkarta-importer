var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');

if (process.argv.length < 5) {
	console.log('node elasticsearch-import.js [index name] [host] [login] [Rest API params?]');

	return;
}

var currentPage = 0;

var formatGender = function(gender) {
	if (gender == 'K' ||
		gender == 'k' ||
		gender == 'kv' ||
		gender == 'Kv') {
		return 'female';
	}
	else if (gender == 'Ma' ||
		gender == 'M' ||
		gender == 'm' ||
		gender == 'ma' ||
		gender == 'Ma') {
		return 'male'
	}
	else {
		return 'unknown';
	}
}

var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

// http://www4.sprakochfolkminnen.se/sagner/api/json_export

var insertChunk = function() {
	var recordsUrl = 'http://frigg-test.sprakochfolkminnen.se/sagendatabas/api/records/?offset='+currentPage+(process.argv[5] ? '&'+process.argv[5] : '');
	request({
		url: recordsUrl,
		json: true
	}, function (error, response, body) {
		console.log(recordsUrl);

		var records = body.results;

		if (records.length > 0) {		
			var bulkBody = [];

			_.each(records, function(item, index) {
				bulkBody.push({
					create: {
						_index: process.argv[2] || 'sagenkarta',
						_type: 'legend',
						_id: item.id
					}
				});
				if (item.persons) {
					_.each(item.persons, function(person) {
						person.name_analysed = person.name;
						if (person.home && person.home.lat && person.home.lng) {
							person.home.location = {
								lat: Number(person.home.lat),
								lon: Number(person.home.lng)
							};
						}
						if (person.birth_year && (person.birth_year == 0 || person.birth_year > 1980)) {
							delete person.birth_year;
						}
						person.gender = formatGender(person.gender);
					});

					item.persons_graph_flat = _.map(item.persons, function(person) {
						return person.name;
					});

					item.persons_graph = _.map(item.persons, function(person) {
						var home = person.home
						if (person.home && person.home.lat && person.home.lng) {
							person.home.location = {
								lat: Number(person.home.lat),
								lon: Number(person.home.lng)
							};
						}

						return person.name && person.name != '' ? {
							id: person.id,
							name: person.name,
							name_id: person.id+': '+person.name,
							home_name: person.home && person.home[0] ? person.home[0].name : null,
							home: person.home ? _.map(person.home, function(home) {
								return {
									id: home.id,
									name: home.name,
									harad: home.harad,
									landskap: home.landskap,
									county: home.county,
									location: home.lat && home.lng ? {
										lat: Number(home.lat),
										lon: Number(home.lng)
									} : null
								}
							}) : []
						} : null;
					});
				}
				if (item.places) {
					_.each(item.places, function(place) {
						if (place.lat && place.lng) {
							place.location = {
								lat: Number(place.lat),
								lon: Number(place.lng)
							};
						}
					});
				}
				if (item.archive.page == 'null') {
					delete item.archive.page;
				}

				if (item.year && (item.year == 0 || item.year > 1980)) {
					delete item.year;
				}

				if (item.materialtype == 'tryck') {
					item.materialtype = 'tryckt';
				}

				bulkBody.push(item);
			});

			var client = new elasticsearch.Client({
				host: esHost,
				log: 'trace'
			});

			client.bulk({
				body: bulkBody
			}, function() {
				currentPage += 50;

				insertChunk();
			});
		}
		else {
			console.log('all done');
		}
	});
}

insertChunk();