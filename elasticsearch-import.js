var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');

if (process.argv.length < 4) {
	console.log('node elasticsearch-import.js --host=[Elasticsearch host] --login=[Elasticsearch login] --index=[index name] --rest_params=[Rest API params?] --bulk_action=[create|update]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var currentPage = 0;

var formatGender = function(gender) {
	if (gender == 'K' ||
		gender == 'k' ||
		gender == 'kv' ||
		gender == 'female' ||
		gender == 'Kv') {
		return 'female';
	}
	else if (gender == 'Ma' ||
		gender == 'M' ||
		gender == 'm' ||
		gender == 'ma' ||
		gender == 'male' ||
		gender == 'Ma') {
		return 'male'
	}
	else {
		return 'unknown';
	}
}

var esHost = (argv.host.indexOf('https://') > -1 ? 'https://' : 'http://')+(argv.login ? argv.login+'@' : '')+(argv.host.replace('http://', '').replace('https://', ''));

// http://www4.sprakochfolkminnen.se/sagner/api/json_export

var insertChunk = function() {
	var recordsUrl = 'http://frigg.sprakochfolkminnen.se/sagendatabas/api/records/?offset='+currentPage+(argv.rest_params ? '&'+argv.rest_params : '');
	request({
		url: recordsUrl,
		json: true
	}, function (error, response, body) {
		console.log(recordsUrl);

		var records = body.results;

		if (records.length > 0) {		
			var bulkBody = [];

			_.each(records, function(item, index) {
				bulkBody.push(argv.bulk_action && argv.bulk_action == 'update' ? {
						update: {
							_index: argv.index || 'sagenkarta',
							_type: 'legend',
							_id: item.id
						}
					} : {
						create: {
							_index: argv.index || 'sagenkarta',
							_type: 'legend',
							_id: item.id
						}
					}
				);
				if (item.persons) {
					_.each(item.persons, function(person) {
						person.name_analysed = person.name;
						if (person.home && person.home.lat && person.home.lng) {
							person.home.location = {
								lat: Number(person.home.lat),
								lon: Number(person.home.lng)
							};
						}
						if (person.birth_year && (person.birth_year == 0 || person.birth_year > 2018)) {
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

				if (item.materialtype == 'tryck') {
					item.materialtype = 'tryckt';
				}

				bulkBody.push(argv.bulk_action == 'update' ? {
					doc: item
				} : item);
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
