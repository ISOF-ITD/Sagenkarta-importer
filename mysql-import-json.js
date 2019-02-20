var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var config = require('./config');

if (process.argv.length < 4) {
	console.log('node mysql-import.js [json file] --action=[categories|persons|records] --categoryType=[type] --recordIdPrefix=[id prefix] --personIdPrefix=[id prefix] --limit=[limit import to x rows] --updatePersonsIfDuplicate=[yes|no] --ignoreRecordsInsertError=[yes|no]');

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
console.log('connection.connect()');

var fileData = JSON.parse(fs.readFileSync(process.argv[2]));

if (argv.limit && Number(argv.limit)) {
	fileData = fileData.slice(0, argv.limit);
	console.log('fileData');
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
		// Slipper formatering, använder male, female och unknown
		//return gender == 'male' ? 'm' : gender == 'female' ? 'k' : gender;
		return gender;
	}

	var persons = _.uniq(_.flatten(_.map(fileData, function(item) {
		return item.persons;
	})), function(item) {
		return item ? item.id : undefined;
	});

	_.each(persons, function(person) {
		if (person) {
			if (argv.updatePersonsIfDuplicate == 'yes') {
				var query = 'INSERT INTO persons (id, name, gender, birth_year) VALUES ('+
					connection.escape((argv.personIdPrefix || '')+person.id)+', '+
					connection.escape(person.name)+', '+
					connection.escape(formatGender(person.gender))+', '+
					(person.birth_year ? (person.birth_year.indexOf('-') > -1 ? person.birth_year.split('-')[0] : Number(person.birth_year) ? person.birth_year : null) : null)+
				') ON DUPLICATE KEY UPDATE name = '+
					connection.escape(person.name)+
					', gender = '+connection.escape(formatGender(person.gender))+
					', birth_year = '+(person.birth_year ? (person.birth_year.indexOf('-') > -1 ? person.birth_year.split('-')[0] : Number(person.birth_year) ? person.birth_year : null) : null);
			}
			else {
				var query = 'INSERT IGNORE INTO persons (id, name, gender, birth_year) VALUES ('+connection.escape((argv.personIdPrefix || '')+person.id)+', '+connection.escape(person.name)+', '+connection.escape(formatGender(person.gender))+', '+(person.birth_year ? (person.birth_year.indexOf('-') > -1 ? person.birth_year.split('-')[0] : Number(person.birth_year) ? person.birth_year : null) : null)+')';
			}

			connection.query(query, function(error, results, fields) {
				if (!error) {
					console.log(query);
				}
				else {
					console.log(error);
					console.log('Error query: '+query);
				}
			});
		}
	});
}

if (action == 'records') {
	console.log('Import records');

	_.each(fileData, function(item) {
		var query = 'INSERT INTO records (id, title, text, year, archive, language, country, archive_id, total_pages, type) VALUES ('+connection.escape(item.id)+', '+connection.escape(item.title)+', '+connection.escape(item.text)+', '+connection.escape(item.year || null)+', '+connection.escape(item.archive.archive)+', '+connection.escape('swedish')+', '+connection.escape(item.archive.country)+', '+connection.escape(item.archive.archive_id)+', '+connection.escape(item.archive.total_pages || 1)+', '+connection.escape(item.materialtype)+')';

		connection.query(query, function(error, results, fields) {
			if (error && argv.ignoreRecordsInsertError != 'yes') {
				console.log(query);
				console.log(error);
			}
			if (!error || argv.ignoreRecordsInsertError == 'yes') {
				console.log('INSERT successful: '+item.id+': '+item.title);

				if (item.taxonomy) {
					_.each(item.taxonomy, function(category) {
						var recordsCategoriesQuery = 'INSERT INTO records_category (record, category) VALUES ('+connection.escape(item.id)+', '+connection.escape(category.category)+')';
						connection.query(recordsCategoriesQuery, function(error1, results, fields) {
							if (error1) {
								console.log(recordsCategoriesQuery);
								console.log(error1);
							}
						});
					});
				}

				if (item.persons) {
					_.each(item.persons, function(person) {
						var recordsPersonsQuery = 'INSERT INTO records_persons (record, person, relation) VALUES ('+connection.escape(item.id)+', '+connection.escape((argv.personIdPrefix || '')+person.id)+', '+connection.escape(person.relation)+')';
						connection.query(recordsPersonsQuery, function(error2, results, fields) {
							if (error2) {
								console.log(recordsPersonsQuery);
								console.log(error2);
							}
						});
					});
				}

				if (item.places) {
					_.each(item.places, function(place) {
						if (place.id && place.id != '') {
							var recordsPlacesQuery = 'INSERT INTO records_places (record, place, type) VALUES ('+connection.escape(item.id)+', '+connection.escape(place.id)+', '+(place.type ? connection.escape(place.type) : connection.escape('place_collected'))+')';
							connection.query(recordsPlacesQuery, function(error3, results, fields) {
								if (error3) {
									console.log(recordsPlacesQuery);
									console.log(error3);
								}
							});
						}
					});
				}

				if (item.metadata) {
					_.each(item.metadata, function(metadataItem) {
						var recordsMetadataQuery = 'INSERT INTO records_metadata (record, type, value) VALUES ('+connection.escape(item.id)+', '+connection.escape(metadataItem.type)+', '+connection.escape(metadataItem.value)+')';
						connection.query(recordsMetadataQuery, function(error4, results, fields) {
							if (error4) {
								console.log(recordsMetadataQuery);
								console.log(error4);
							}
						});
					});
				}

				if (item.media) {
					_.each(item.media, function(mediaItem) {
						var recordsMediaQuery = 'INSERT INTO records_media (record, type, source, title) VALUES ('+connection.escape(item.id)+', '+connection.escape(mediaItem.type)+', '+connection.escape(mediaItem.source)+', '+connection.escape(mediaItem.title)+')';
						connection.query(recordsMediaQuery, function(error5, results, fields) {
							if (error5) {
								console.log(recordsMediaQuery);
								console.log(error5);
							}
						});
					});
				}
			}
		});
	});
}