var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');

var currentPage = 0;

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

				if (item.materialtype == 'tryck') {
					item.materialtype = 'tryckt';
				}

				bulkBody.push(item);
			});

			var client = new elasticsearch.Client({
				host: 'localhost:9200',
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