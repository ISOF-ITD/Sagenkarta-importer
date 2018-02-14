var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var config = require('./config');

if (process.argv.length < 4) {
	console.log('node mysql-import.js [json file] --action=[categories|persons|records] --categoryType=[type] --recordIdPrefix=[id prefix] --personIdPrefix=[id prefix] --limit=[limit import to x rows]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var action = argv.action;

var connection = mysql.createConnection({
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database
});

connection.connect();

var fileData = JSON.parse(fs.readFileSync(process.argv[2]));

if (argv.limit && Number(argv.limit)) {
	fileData = fileData.slice(0, argv.limit);
}

if (action == 'categories') {
	var categories = _.uniq(_.flatten(_.map(fileData, function(item) {
		return item.taxonomy;
	})), function(item) {
		return item.category;
	});

	_.each(categories, function(category) {
		var query = 'INSERT IGNORE INTO categories_v2 (id, name, type) VALUES ('+connection.escape(category.category)+', '+connection.escape(category.name)+', '+connection.escape(argv.categoryType)+')';

		connection.query(query, function(error, results, fields) {
			if (!error) {
				console.log(query);
			}
		});
	});
}

if (action == 'persons') {
	console.log('Import persons');

	var formatGender = function(gender) {
		return gender == 'male' ? 'm' : gender == 'female' ? 'k' : '';
	}

	var persons = _.uniq(_.flatten(_.map(fileData, function(item) {
		return item.persons;
	})), function(item) {
		return item ? item.id : undefined;
	});

	_.each(persons, function(person) {
		if (person) {		
			var query = 'INSERT IGNORE INTO persons (id, name, gender, birth_year) VALUES ('+connection.escape((argv.personIdPrefix || '')+person.id)+', '+connection.escape(person.name)+', '+connection.escape(formatGender(person.gender))+', '+connection.escape(person.birth_year)+')';

			connection.query(query, function(error, results, fields) {
				if (!error) {
					console.log(query);
				}
			});
		}
	});
}

if (action == 'records') {
	console.log('Import records');

	_.each(fileData, function(item) {
		var query = 'INSERT INTO records (id, title, text, year, archive, language, country, archive_id, total_pages, type) VALUES ('+connection.escape(item.id)+', '+connection.escape(item.title)+', '+connection.escape(item.text)+', '+connection.escape(item.year || null)+', '+connection.escape(item.archive.archive)+', '+connection.escape('swedish')+', '+connection.escape(item.archive.country)+', '+connection.escape(item.archive.archive_id)+', '+connection.escape(item.archive.total_pages || 1)+', '+connection.escape(item.materialtype)+')';
		console.log(query);

		connection.query(query, function(error, results, fields) {
			if (!error) {
				console.log(query);
				if (item.taxonomy) {
					_.each(item.taxonomy, function(category) {
						console.log(category);
						connection.query('INSERT INTO records_category (record, category) VALUES ('+connection.escape(item.id)+', '+connection.escape(category.category)+')', function(error1, results, fields) {
							if (error1) {
								console.log(error1);
							}
						});
					});
				}

				if (item.persons) {
					_.each(item.persons, function(person) {
						console.log(person);
						connection.query('INSERT INTO records_persons (record, person, relation) VALUES ('+connection.escape(item.id)+', '+connection.escape((argv.personIdPrefix || '')+person.id)+', '+connection.escape(person.relation)+')', function(error2, results, fields) {
							if (error2) {
								console.log(error2);
							}
						});
					});
				}

				if (item.places) {
					_.each(item.places, function(place) {
						console.log(place);
						connection.query('INSERT INTO records_places (record, place, type) VALUES ('+connection.escape(item.id)+', '+connection.escape(place.id)+', '+connection.escape(place.type)+')', function(error3, results, fields) {
							if (error3) {
								console.log(error3);
							}
						});
					});
				}

				if (item.metadata) {
					_.each(item.metadata, function(metadataItem) {
						console.log(metadataItem);
						connection.query('INSERT INTO records_metadata (record, type, value) VALUES ('+connection.escape(item.id)+', '+connection.escape(metadataItem.type)+', '+connection.escape(metadataItem.value)+')', function(error4, results, fields) {
							if (error4) {
								console.log(error4);
							}
						});
					});
				}

				if (item.media) {
					_.each(item.media, function(mediaItem) {
						console.log(mediaItem);
						connection.query('INSERT INTO records_media (record, type, source, title) VALUES ('+connection.escape(item.id)+', '+connection.escape(mediaItem.type)+', '+connection.escape(mediaItem.source)+', '+connection.escape(mediaItem.title)+')', function(error5, results, fields) {
							if (error5) {
								console.log(error5);
							}
						});
					});
				}
			}
		});
	});
}