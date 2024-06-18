//https://stackoverflow.com/questions/20433287/node-js-request-cert-has-expired
//DANGEROUS This disables HTTPS / SSL / TLS checking across your entire node.js environment.
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var request = require('request');
var elasticsearch = require('@elastic/elasticsearch');
var _ = require('underscore');
var fs = require('fs');

if (process.argv.length < 4) {
	console.log('node elasticsearch-import.js --host=[Elasticsearch host] --user=[Elasticsearch user] --password=[Elasticsearch password] --login=[Elasticsearch login] --index=[index name] --rest_params=[Rest API params?]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var currentPage = 0;

var maxPages = 10000000;

if (argv.maxpages) {
    maxPages = argv.maxpages;
    console.log('maxpages=' + argv.maxpages);
}

if (argv.currentpage) {
    currentPage = argv.currentpage;
    console.log('currentPage=' + argv.currentpage);
}

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

// http://www4.isof.se/sagner/api/json_export
// Updated code accroding to javascript-api version 8.14 from https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
function insertChunk() {
//var insertChunk = function() {
	var recordsUrl = 'https://garm.isof.se/folkeservice/api/records/?offset='+currentPage+(argv.rest_params ? '&'+argv.rest_params : '');
	request({
		url: recordsUrl,
		json: true,
		strictSSL: false,
	}, async function (error, response, body) {
		console.log(new Date().toLocaleString() + ": " + recordsUrl);
		//console.log(response);
		if (error) console.log(error);

		var records = body.results;

		//console.log('records.length');
		console.log(records.length);
		if (records.length > 0) {		
			var bulkBody = [];

			//console.log('before _each');
			_.each(records, function(item, index) {
				//console.log('before bulkBody push');
				//console.log(bulkBody);
				bulkBody.push({
						index: {
							_index: argv.index || 'sagenkarta',
							//_type: 'legend',
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

				bulkBody.push(item);
			});

			var options = {
				node: esHost,
				log: 'trace',
				auth: {
					username: argv.user,
					password: argv.password
				},
				// Create a custom agent with rejectUnauthorized set to false
				tls: {
					rejectUnauthorized: false
				}	
			};

			if (argv.cacert) {
				options.ssl = {
					ca: fs.readFileSync(argv.cacert),
					rejectUnauthorized: true
				};
			}
			console.log(bulkBody.length);


			console.log(options);
			var client = new elasticsearch.Client(options);

			try {			
				console.log('before client.bulk');
				console.log(bulkBody.length);
				// Updated code accroding to javascript-api version 8.14 from https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
				// await function instead of return function 
				const response = await client.bulk({
					body: bulkBody
				});
				if (response.errors) {
					console.log('Bulk insert had errors:', response.errors);
				  } else {
					currentPage += 50;
					if (currentPage < maxPages) {
						//console.log('before pausecomp');
						pausecomp(5000);
						//console.log('before insertChunk');
						insertChunk();
						//console.log('after insertChunk');
					} else {
						console.log('Stop at '+currentPage);
					}
					console.log('Bulk insert was successful');
				  }				
				//Old API with return function instead of await: elasticsearch@15.5.0:
/* 				, function(result) {
					console.log('before if result');
					console.log(result);
					if (result) {
						console.log('result:');
						console.log(result);
					}
					console.log('after if result');
					currentPage += 50;

					if (currentPage < maxPages) {
						console.log('before pausecomp');
						pausecomp(5000);
						console.log('before insertChunk');
						insertChunk();
						console.log('after insertChunk');
					} else {
						console.log('Stop at '+currentPage);
					}
				}); */
				console.log('after client.bulk');
			} catch (error) {
				console.error('Error executing bulk insert:', error);
			}
		} else {
			console.log('all done');
		}
	});
}

function pausecomp(millis)
{
    var date = new Date();
    var curDate = null;
    do { curDate = new Date(); }
    while(curDate-date < millis);
}

console.log(argv.host);
console.log(new Date().toLocaleString());
insertChunk();
