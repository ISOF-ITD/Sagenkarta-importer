var request = require('request');
var _ = require('underscore');
var fetch = require('node-fetch');

var cypherUrl = 'http://neo4j:goltott kind@localhost:7474/db/data/cypher';
var pageSize = 100;

var action = process.argv[2];

if (process.argv.length < 3) {
	console.log('node neo4j-import [legends|relations]')

	return;
}

function importNodes(fieldName, nodeType) {
	request({
		url: apiUrl,
		json: true
	}, function (error, response, body) {
		var index = 0;

		function importMetadata() {
			var text = body[index];

			console.log(artwork[fieldName]);

			if (!artwork[fieldName] || artwork[fieldName].length == 0) {
				index++;
				importMetadata();
					
				return;				
			}
			_.each(artwork[fieldName], function(item) {
				if (item == '') {
					return;
				}

				var itemName = fieldName == 'persons' ? item.split('"').join('').split('&quot;').join('') : item;

				var createNodeQuery = {
					query: 'CREATE (a:'+nodeType+' {name: "'+(itemName)+'"}) RETURN a',
				};

				fetch(cypherUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(createNodeQuery)
				}).then(function(response) {
					if (index < body.length-1) {
						index++;

						importMetadata();
					}
					else {
						console.log('All done!')
					}
				});
			});
		}

		importMetadata();
	});
}

function importLinks(fieldName, nodeType) {
	request({
		url: 'http://cdh-vir-1.it.gu.se:8004/person_relations',
		json: true
	}, function (error, response, body) {
		var index = 0;

		function createLink() {
			var artwork = body[index];

			console.log(artwork[fieldName]);

			if (!artwork[fieldName] || artwork[fieldName].length == 0) {
				index++;
				createLink();
					
				return;				
			}
			_.each(artwork[fieldName], function(item) {
				if (item == '') {
					return;
				}

				var itemName = fieldName == 'persons' ? item.split('"').join('').split('&quot;').join('') : item;

				var createLinkQuery = {
					query: 'MATCH (a:Object {id: \''+artwork.id+'\'}), (b:'+nodeType+' {name: \''+itemName+'\'}) CREATE (a)<-[r:SUBJECT_OF]-(b)'
				};

				fetch(cypherUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(createLinkQuery)
				}).then(function(response) {
					if (index < body.length-1) {
						index++;

						createLink();
					}
					else {
						console.log('All done!')
					}
				});
			});
		}

		createLink();
	});
}

if (action == 'legends') {
	var currentPage = 0;

	var insertChunk = function() {
		console.log('Loading from index '+currentPage);
		request({
			url: 'http://www4.sprakochfolkminnen.se/sagner/api/json_export/'+currentPage+'/'+pageSize+'/type/arkiv;tryckt/include_text/false',
			json: true
		}, function (error, response, body) {
			if (error) {
				console.log(error);
				return;
			}

			var index = 0;

			function importLegend() {
				var legend = body.data[index];

				var createLegendQuery = {
					query: 'CREATE (a:Text {id: "'+legend.id+'", title: "'+legend.title+'", category: "'+(legend.taxonomy.category || '')+'", type: "'+legend.type+'", year: "'+legend.year+'"}) RETURN a',
				};

				console.log('Insert Text: "'+legend.title+'" ('+legend.id+')');

				var places = [];

				_.each(legend.persons, function(person) {
					console.log('Insert Person: "'+person.name+'" ('+person.id+')');

					var createPersonQuery = {
						query: 'CREATE (a:Person {id: "'+person.id+'", name: "'+person.name+'", birth_year: "'+person.birth_year+'", genre: "'+person.gender+'"}) RETURN a',
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createPersonQuery)
					}).then(function() {

					}).catch(function() {

					});

					if (person.home.id) {
						places.push(person.home);
					}
				});

				places = _.uniq(_.union(places, legend.places), function(place) {
					return place.id;
				});

				_.each(places, function(place) {
					console.log('Insert Place: "'+place.name+'" ('+place.id+')');
					var createPlaceQuery = {
						query: 'CREATE (a:Place {id: "'+place.id+'", name: "'+place.name+'", landskap: "'+place.landskap+'", county: "'+place.county+'", lat: "'+place.lat+'", lng: "'+place.lng+'"}) RETURN a',
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createPlaceQuery)
					}).then(function() {

					}).catch(function() {
						
					});
				});

				fetch(cypherUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(createLegendQuery)
				}).then(function(response) {
					if (index < body.data.length-1) {
						index++;

						importLegend();
					}
					else {
						currentPage += pageSize;

						insertChunk();
					}
				}).catch(function(error) {
					console.log(error);
				});
			}

			console.log(body.data.length);

			if (body.data.length > 0) {
				importLegend();
			}
			else {
				console.log('All done!');
			}
		});
	}

	insertChunk();

}
if (action == 'relations') {
	var currentPage = 0;

	var insertChunk = function() {
		console.log('Loading from index '+currentPage);
		request({
			url: 'http://www4.sprakochfolkminnen.se/sagner/api/json_export/'+currentPage+'/'+pageSize+'/type/arkiv;tryckt/include_text/false',
			json: true
		}, function (error, response, body) {
			if (error) {
				console.log(error);
				return;
			}

			var index = 0;

			function importLegendRelations() {
				var legend = body.data[index];

				console.log('Insert relations to: "'+legend.title+'" ('+legend.id+')');

				_.each(legend.persons, function(person) {
					console.log('Insert relation between "'+legend.title+'" ('+legend.id+') and "'+person.name+'" ('+person.id+')');

					var createRelationQuery = {
						query: 'MATCH (t:Text {id: "'+legend.id+'"}), (p:Person {id: "'+person.id+'"}) CREATE UNIQUE (t)<-[:'+(person.relation == 'collector' ? 'COLLECTED' : person.relation == 'informant' ? 'TOLD' : 'DEFAULT')+']-(p)'
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createRelationQuery)
					}).then(function() {

					}).catch(function() {

					});

					if (person.home && person.home.id) {
						var createHomeRelationQuery = {
							query: 'MATCH (t:Person {id: "'+person.id+'"}), (p:Place {id: "'+person.home.id+'"}) CREATE UNIQUE (t)-[:BORN_IN]->(p)'
						};

						fetch(cypherUrl, {
							method: 'POST',
							headers: {'Content-Type': 'application/json'},
							body: JSON.stringify(createHomeRelationQuery)
						}).then(function() {

						}).catch(function() {

						});
					}
				});

				_.each(legend.places, function(place) {
					console.log('Insert relation between "'+legend.title+'" ('+legend.id+') and "'+place.name+'" ('+place.id+')');

					var createRelationQuery = {
						query: 'MATCH (t:Text {id: "'+legend.id+'"}), (p:Place {id: "'+place.id+'"}) CREATE UNIQUE (t)-[:COLLECTED_IN]->(p)'
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createRelationQuery)
					}).then(function() {

					}).catch(function() {

					});
				});

				if (index < body.data.length-1) {
					index++;

					importLegendRelations();
				}
				else {
					currentPage += pageSize;

					setTimeout(function() {
						insertChunk();
					}, 500);
				}

			}

			console.log(body.data.length);

			if (body.data.length > 0) {
				importLegendRelations();
			}
			else {
				console.log('All done!');
			}
		});
	}

	insertChunk();

}
