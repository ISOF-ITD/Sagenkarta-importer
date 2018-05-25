var request = require('request');
var elasticsearch = require('elasticsearch');
var _ = require('underscore');

if (process.argv.length < 4) {
	console.log('node elasticsearch-import.js --index=[index name] --host=[host] --login=[login, behövs inte för oden-test]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var currentPage = 0;

var esHost = (argv.host.indexOf('https://') > -1 ? 'https://' : 'http://')+(argv.login ? argv.login+'@' : '')+(argv.host.replace('http://', '').replace('https://', ''));

// http://www4.sprakochfolkminnen.se/sagner/api/json_export

var insertChunk = function() {
	var recordsUrl = 'http://frigg-test.sprakochfolkminnen.se/ortnamnsregistret/api/ortnamn/?offset='+currentPage;
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
						_index: argv.index,
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
