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

if (action == 'legends') {
	var currentPage = 0;

	var insertChunk = function() {
		console.log('Loading from index '+currentPage);
		request({
			url: 'http://frigg-test.sprakochfolkminnen.se/sagendatabas/api/es/documents/?type=arkiv,tryckt&size=100&from='+currentPage,
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
					query: 'CREATE (a:Text {id: "'+legend._source.id+'", title: "'+legend._source.title+'", category: "'+(legend._source.taxonomy ? legend._source.taxonomy.category : '')+'", type: "'+legend._source.materialtype+'", year: "'+legend._source.year+'"}) RETURN a',
				};

				console.log('Insert Text: "'+legend._source.title+'" ('+legend._source.id+')');

				var places = [];

				if (legend._source.taxonomy) {
					var createCategoryQuery = {
						query: 'CREATE (a:Category {id: "'+legend._source.taxonomy.category+'", name: "'+legend._source.taxonomy.name+'"}) RETURN a',
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createCategoryQuery)
					}).then(function() {

					}).catch(function() {
						
					});
				}

				var createTypeQuery = {
					query: 'CREATE (a:Materialtype {name: "'+legend._source.materialtype+'"}) RETURN a',
				};

				fetch(cypherUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(createTypeQuery)
				}).then(function() {

				}).catch(function() {
					
				});

				_.each(legend._source.persons, function(person) {
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

					if (person.home && person.home.id) {
						places.push(person.home);
					}
				});

				places = _.uniq(_.union(places, legend._source.places), function(place) {
					return place.id;
				});

				_.each(places, function(place) {
					console.log('Insert Place: "'+place.name+'" ('+place.id+')');
					var createPlaceQuery = {
						query: 'CREATE (a:Place {id: "'+place.id+'", name: "'+place.name+'", landskap: "'+place.landskap+'", county: "'+place.county+'", lat: "'+place.location.lat+'", lng: "'+place.location.lon+'"}) RETURN a',
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
			url: 'http://frigg-test.sprakochfolkminnen.se/sagendatabas/api/es/documents/?type=arkiv,tryckt&size=100&from='+currentPage,
			json: true
		}, function (error, response, body) {
			if (error) {
				console.log(error);
				return;
			}

			var index = 0;

			function importLegendRelations() {
				var legend = body.data[index];

				console.log('Insert relations to: "'+legend._source.title+'" ('+legend._source.id+')');

				_.each(legend._source.persons, function(person) {
					console.log('Insert relation between "'+legend._source.title+'" ('+legend._source.id+') and "'+person.name+'" ('+person.id+')');

					var createRelationQuery = {
						query: 'MATCH (t:Text {id: "'+legend._source.id+'"}), (p:Person {id: "'+person.id+'"}) CREATE UNIQUE (t)<-[:'+(person.relation == 'c' ? 'COLLECTED' : person.relation == 'i' ? 'TOLD' : 'DEFAULT')+']-(p)'
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
					console.log('Insert relation between "'+legend._source.title+'" ('+legend._source.id+') and "'+place.name+'" ('+place.id+')');

					var createRelationQuery = {
						query: 'MATCH (t:Text {id: "'+legend._source.id+'"}), (p:Place {id: "'+place.id+'"}) CREATE UNIQUE (t)-[:COLLECTED_IN]->(p)'
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createRelationQuery)
					}).then(function() {

					}).catch(function() {

					});
				});

				if (legend._source.taxonomy) {
					var createCategoryRelationQuery = {
						query: 'MATCH (t:Text {id: "'+legend._source.id+'"}), (c:Category {id: "'+legend._source.taxonomy.category+'"}) CREATE UNIQUE (t)-[:IN_CATEGORY]->(c)'
					};

					fetch(cypherUrl, {
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify(createCategoryRelationQuery)
					}).then(function() {

					}).catch(function() {

					});
				}

				var createTypeRelationQuery = {
					query: 'MATCH (t:Text {id: "'+legend._source.id+'"}), (m:Materialtype {name: "'+legend._source.materialtype+'"}) CREATE UNIQUE (t)-[:OF_TYPE]->(m)'
				};

				fetch(cypherUrl, {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(createTypeRelationQuery)
				}).then(function() {

				}).catch(function() {

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
