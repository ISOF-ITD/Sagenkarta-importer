var _ = require('underscore');
var elasticsearch = require('elasticsearch');

if (process.argv.length < 4) {
	console.log('node createIndex-ortnamn.js --host=[Elasticsearch host] --login=[Elasticsearch login] --index=[index name] --cacert=[file path]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var esHost = (argv.host.indexOf('https://') > -1 ? 'https://' : 'http://')+(argv.login ? argv.login+'@' : '')+(argv.host.replace('http://', '').replace('https://', ''));

var client = new elasticsearch.Client({
	host: esHost
});

client.indices.create({
	index: argv.index,
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
