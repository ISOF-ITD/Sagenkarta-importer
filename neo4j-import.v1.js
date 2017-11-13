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
//	url: 'http://localhost/ISOF/Sagenkarta-API/relations/type/arkiv;tryckt',
	url: 'http://www4.sprakochfolkminnen.se/sagner/api/relations/type/arkiv;tryckt',
	json: true
}, function (error, response, body) {
	var index = 0;

	function importLegend() {
		var legend = body[index];

		var collectors = _.filter(legend.persons, function(person) {
			return person.relation == 'c';
		});

		var informants = _.filter(legend.persons, function(person) {
			return person.relation == 'i';
		});

		var createTextQuery = {
			query: 'CREATE (a:Text {id: '+legend.id+', title: "'+legend.title+'"}) RETURN a',
		};

		fetch(cypherUrl, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(createTextQuery)
		}).then(function(response) {
//			console.log(response);
			console.log(createTextQuery.query);

			_.each(legend.persons, function(person) {
				if (person.name == '') {
					return;
				}

				var createPersonQuery = {
					query: 'CREATE (a:Person {id: '+person.id+', name: "'+person.name+'"}) RETURN a',
				};

				fetch(cypherUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(createPersonQuery)
				}).then(function(response) {
					if (collectors.length > 0 && informants.length > 0) {
						console.log('import');

						_.each(collectors, function(collector) {
							_.each(informants, function(informant) {
								var cypherQuery = {
									query: 'MATCH (a:Person),(b:Person) WHERE (a.id = '+collector.id+') AND (b.id = '+informant.id+') CREATE UNIQUE (a)-[r:COLLECTED_FROM]->(b) RETURN r',
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

//					console.log(response);
					console.log(createPersonQuery.query);

					var createRelationQuery = {
						query: 'MATCH (t:Text),(p:Person) WHERE (t.id = '+legend.id+') AND (p.id = '+person.id+') CREATE UNIQUE (t)<-[r:'+(person.relation == 'c' ? 'COLLECTED' : person.relation == 'i' ? 'TOLD' : 'UNCERTAIN')+']-(p) RETURN r',
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createRelationQuery)
					}).then(function(response) {
//						console.log(response);
						console.log(createRelationQuery.query);

						if (index < body.length) {
							index++;

							importLegend();
						}
					});
				});
			});
		});
	}

	importLegend();
});
