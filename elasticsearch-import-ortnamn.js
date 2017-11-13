var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');

if (process.argv.length < 5) {
	console.log('node elasticsearch-import.js [index name] [host] [login]');

	return;
}

var currentPage = 0;

var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

// http://www4.sprakochfolkminnen.se/sagner/api/json_export

var insertChunk = function() {
	var recordsUrl = 'http://localhost:8000/api/ortnamn/?offset='+currentPage;
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
						_type: 'ortnamn',
						_id: item.id
					}
				});

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