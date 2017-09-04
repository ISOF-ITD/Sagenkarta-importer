var request = require('request');
var _ = require('underscore');
var fetch = require('node-fetch');

/*
if (process.argv.length < 5) {
	console.log('node es-import.js [index name] [host] [login]');

	return;
}

var esHost = 'http://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');
*/

var cypherUrl = 'http://root:lcp010xx@localhost:7474/db/data/cypher';

request({
	url: 'http://localhost/ISOF/Sagenkarta-API/relations/type/arkiv;tryckt',
	json: true
}, function (error, response, body) {
	_.each(body, function(legend) {
		var collectors = _.filter(legend.persons, function(person) {
			return person.relation == 'c';
		});

		var informants = _.filter(legend.persons, function(person) {
			return person.relation == 'i';
		});

		if (collectors.length > 0 && informants.length > 0) {
			console.log('import');

			_.each(collectors, function(collector) {
				_.each(informants, function(informant) {
					var cypherQuery = {
						query: 'MATCH (a:Person),(b:Person) WHERE (a.id = '+collector.id+') AND (b.id = '+informant.id+') CREATE UNIQUE (a)<-[r:TOLD]-(b) RETURN r',
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(cypherQuery)
					}).then(function(response) {
						console.log(response);

						console.log(cypherQuery.query);
					});
				});
			});
		}
	})
});
