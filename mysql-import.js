var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

if (process.argv.length < 4) {
	console.log('node mysql-import.js [persons.json] [records.json]');

	return;
}

function mysql_real_escape_string (str) {
	if (typeof str == 'undefined') {
		return '';
	}
	return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
		switch (char) {
			case "\0":
				return "\\0";
			case "\x08":
				return "\\b";
			case "\x09":
				return "\\t";
			case "\x1a":
				return "\\z";
			case "\n":
				return "\\n";
			case "\r":
				return "\\r";
			case "\"":
			case "'":
			case "\\":
			case "%":
				return "\\"+char; // prepends a backslash to backslash, percent,
								  // and double/single quotes
		}
	});
}

function formatCategory(category) {
	return category.substr(0, 1);
}

var legendsData = fs.readFileSync(process.argv[3]);
var personsData = fs.readFileSync(process.argv[2]);

var legends = JSON.parse(legendsData);
var persons = JSON.parse(personsData);

console.log('legends: '+legends.length);

/*
legends = _.filter(legends, function(item) {
	return item.type == 'Arkiv';
});
*/
var personsPlaces = [];
var legendPlaces = [];
var legendPersons = [];

var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'svenska_sagor'
});

connection.connect();
connection.query('TRUNCATE TABLE persons');
connection.query('TRUNCATE TABLE records');
connection.query('TRUNCATE TABLE persons_places');
connection.query('TRUNCATE TABLE records_persons');
connection.query('TRUNCATE TABLE records_places');
connection.query('TRUNCATE TABLE records_category');
connection.query('TRUNCATE TABLE records_places');
connection.query('TRUNCATE TABLE media');
connection.query('TRUNCATE TABLE records_media');

var genders = _.uniq(_.pluck(persons, 'gender'));

var processPerson = function(person) {
	var personId = Number(person.id.replace(/p|P/, ''));
	person.id = personId;

	if (Number(person.id) && Number(person.id) > 0) {	
		if (Number(person.socken) && Number(person.socken) > 0) {
			personsPlaces.push({
				person: person.id,
				place: person.socken
			});
			var query = 'INSERT INTO persons_places (person, place) VALUES ('+
				person.id+', '+
				person.socken+')'
			;
			connection.query(query);
		}

		var query = 'INSERT IGNORE INTO persons ('+
			'id, '+
			'name, '+
			'gender, '+
			'birth_year, '+
			'address, '+
			'biography, '+
			'image) '+
			'VALUES ('+
				'"'+person.id+'",'+
				'"'+mysql_real_escape_string(person.firstname+' '+person.surname)+'",'+
				'"'+(
					person.gender == 'Man' ? 'm' : (
						person.gender =='Kvinna' ? 'k' : person.gender
					)
				)+'",'+
				'"'+(Number(person.birth) ? person.birth : '')+'",'+
				'"'+mysql_real_escape_string(person.address)+'",'+
				'"'+mysql_real_escape_string(person.biography)+'",'+
				'"'+mysql_real_escape_string(person.image)+'"'+
			')'
		;
		connection.query(query);
	}
};

_.each(persons, processPerson);

var mediaCounter = 1;

_.each(legends, function(legend, index) {
//	var id = index+1;
	var id = legend.Nummer;

	var collectorIds = legend.PersonId_Uppt.split(';');
	var informatIds = legend.PersonId_Inf.split(';');

	var query = 'INSERT INTO records ('+
		'id, '+
		'title, '+
		'text, '+
		'category, '+
		'type, '+
		'year, '+
		'archive, '+
		'archive_id, '+
		'archive_page, '+
		'source, '+
		'informant_name, '+
		'comment) VALUES ('+
			'"'+id+'", '+
			'"'+mysql_real_escape_string(legend.Titel)+'", '+
			'"'+mysql_real_escape_string(legend.Text)+'", '+
			'"'+mysql_real_escape_string(formatCategory(legend.Nyakategorier))+'", '+
			'"'+mysql_real_escape_string(legend.type.toLowerCase())+'", '+
			'"'+(legend.year == '' ? 'null' : Number(legend.year))+'", '+
			'"'+mysql_real_escape_string(legend.Arkiv)+'", '+
			'"'+mysql_real_escape_string(legend.archive_nr)+'", '+
			'"'+(legend.page > 0 ? legend.page : 'null')+'", '+
			'"'+mysql_real_escape_string(legend.source)+'", '+
			'"'+mysql_real_escape_string(legend.informant_name)+'", '+
			'"'+mysql_real_escape_string(legend.comment)+'"'+
		')'
	;

	connection.query(query);
/*
	if (legend.klintberg_category != '') {
		query = 'INSERT INTO records_category (record, category, type, level) VALUES ('+
			id+', '+
			'"'+mysql_real_escape_string(legend.klintberg_category)+'", '+
			'"klintberg", 0)'
		;
		connection.query(query);
	}

	if (legend.klintberg_subcategory != '') {
		query = 'INSERT INTO records_category (record, category, type, level) VALUES ('+
			id+', '+
			'"'+mysql_real_escape_string(legend.klintberg_subcategory)+'", '+
			'"klintberg", 1)'
		;
		connection.query(query);
	}

	if (legend.klintberg_type != '') {
		query = 'INSERT INTO records_category (record, category, type, level) VALUES ('+
			id+', '+
			'"'+mysql_real_escape_string(legend.klintberg_type)+'", '+
			'"klintberg", 2)'
		;
		connection.query(query);
	}
*/
	if (collectorIds.length > 0) {
		_.each(collectorIds, function(collector) {
			var collectorId = Number(collector.replace(/p|P/, ''));

			if (collectorId) {
				legendPersons.push({
					legend: id,
					person: collectorId,
					relation: 'c'
				});
				var query = 'INSERT INTO records_persons (record, person, relation) VALUES ('+
					id+', '+
					collectorId+', '+
					'"c")'
				;
				connection.query(query);
			}
		})
	}

	if (informatIds.length > 0) {
		_.each(informatIds, function(informant) {
			var informatId = Number(informant.replace(/p|P/, ''));

			if (informatId) {
				legendPersons.push({
					legend: id,
					person: informatId,
					relation: 'i'
				});
				var query = 'INSERT INTO records_persons (record, person, relation) VALUES ('+
					id+', '+
					informatId+', '+
					'"i")'
				;
				connection.query(query);

			}
		})
	}

	var sockenIds = legend.SockenId.split(';');

	if (sockenIds.length > 0) {
		_.each(sockenIds, function(socken) {
			var sockenId = Number(socken);

			if (sockenId) {		
				legendPlaces.push({
					legend: id,
					place: sockenId
				});
				var query = 'INSERT INTO records_places (record, place) VALUES ('+
					id+', '+
					sockenId+')'
				;
				connection.query(query);
			}
		})
	}


	if (legend.image != '') {
		var images = legend.image.split(';');

		_.each(images, function(image) {
			var query = 'INSERT INTO media (id, source, type) VALUES ('+
				mediaCounter+', '+
				'"'+image+'", '+
				'"image")'
			;
			connection.query(query);

			var query = 'INSERT INTO records_media (record, media) VALUES ('+
				id+', '+
				mediaCounter+')'
			;
			connection.query(query);

			mediaCounter++;
		});
	}
});

connection.end();