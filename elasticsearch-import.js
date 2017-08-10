var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');

if (process.argv.length < 5) {
	console.log('node elasticsearch-import.js [index name] [host] [login]');

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
	request({
		url: 'http://localhost/ISOF/Sagenkarta-API/json_export/'+currentPage+'/1000',
		json: true
	}, function (error, response, body) {
		var records = body.data;

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
						person.name_analyzed = person.name;
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
				item.materialtype = item.type;
				delete item.type;

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
				currentPage += 1000;

				insertChunk();
			});
		}
		else {
			console.log('all done');
		}
	});
}

insertChunk();