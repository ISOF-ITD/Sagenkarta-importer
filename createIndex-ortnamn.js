var _ = require('underscore');
var elasticsearch = require('elasticsearch');

if (process.argv.length < 5) {
	console.log('node createIndex.js [index name] [host] [login]');

	return;
}

var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

var client = new elasticsearch.Client({
	host: esHost
});

client.indices.create({
	index: process.argv[2] || 'sagenkarta',
	body: {
		mappings: {
			ortnamn: {
				properties: {
					location: {
						type: 'geo_point'
					},
					type: {
						type: 'keyword'
					},
					type_specific: {
						type: 'keyword'
					},
					socken: {
						properties: {
							location: {
								type: 'geo_point'
							}
						}
					},
					geometry_source: {
						type: 'keyword'
					}
				}
			}
		}
	}
}, function(err) {
	if (err) {
		console.log(err);
	}
});
