var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

if (process.argv.length < 4) {
	console.log('node mysql-import.js [json file] --action=[categories|persons|records] --category_type=[type]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var action = argv.action;

var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'svenska_sagor'
});

connection.connect();

var fileData = JSON.parse(fs.readFileSync(process.argv[2]));

if (action == 'categories') {
	var categories = _.uniq(_.flatten(_.map(fileData, function(item) {
		return item.taxonomy;
	})), function(item) {
		return item.category;
	});

	_.each(categories, function(category) {
		var query = 'INSERT IGNORE INTO categories_v2 (id, name, type) VALUES ('+connection.escape(category.category)+', '+connection.escape(category.name)+', '+connection.escape(argv.category_type)+')';

		connection.query(query, function(error, results, fields) {
			if (!error) {
				console.log(query);
			}
		});
	});
}

if (action == 'persons') {
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
			var query = 'INSERT IGNORE INTO persons (id, name, gender, birth_year) VALUES ('+connection.escape('acc'+person.id)+', '+connection.escape(person.name)+', '+connection.escape(formatGender(person.gender))+', '+connection.escape(person.birth_year)+')';

			connection.query(query, function(error, results, fields) {
				if (!error) {
					console.log(query);
				}
			});
		}
	});
}

if (action == 'records') {
	_.each(fileData, function(item) {
		var query = 'INSERT INTO records (id, title, text, year, archive, language, country, archive_id, total_pages, type) VALUES ('+connection.escape(item.id)+', '+connection.escape(item.title)+', "", '+connection.escape(item.year ? item.year.split('-')[0] : null)+', '+connection.escape(item.archive.archive)+', '+connection.escape('swedish')+', '+connection.escape(item.archive.country)+', '+connection.escape(item.archive.archive_id)+', '+connection.escape(item.archive.total_pages)+', '+connection.escape(item.materialtype)+')';

		connection.query(query, function(error, results, fields) {
			if (!error) {
				console.log(query);
				if (item.taxonomy) {
					_.each(item.taxonomy, function(category) {
						console.log(category);
						connection.query('INSERT INTO records_category (record, category) VALUES ('+connection.escape(item.id)+', '+connection.escape(category.category)+')', function(error1, results, fields) {
							console.log(error1);
						});
					});
				}

				if (item.persons) {
					_.each(item.persons, function(person) {
						console.log(person);
						connection.query('INSERT INTO records_persons (record, person, relation) VALUES ('+connection.escape(item.id)+', '+connection.escape('acc'+person.id)+', '+connection.escape(person.relation)+')', function(error2, results, fields) {
							console.log(error2);
						});
					});
				}

				if (item.places) {
					_.each(item.places, function(place) {
						console.log(place);
						connection.query('INSERT INTO records_places (record, place, type) VALUES ('+connection.escape(item.id)+', '+connection.escape(place.id)+', '+connection.escape(place.type)+')', function(error3, results, fields) {
							console.log(error3);
						});
					});
				}
			}
		});
	});
}