var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var config = require('./config');

if (process.argv.length < 4) {
	console.log('node mysql-nfs-import.js [persons data file] [legends data file]');

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
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database
});

connection.connect();

var genders = _.uniq(_.pluck(persons, 'gender'));

var processPerson = function(person) {
	var query = 'INSERT IGNORE INTO persons ('+
		'id, '+
		'name, '+
		'gender, '+
		'birth_year, '+
		'address, '+
		'biography, '+
		'image) '+
		'VALUES ('+
			'"'+person.Nr+'",'+
			'"'+mysql_real_escape_string(person['Förnamn']+' '+person['Efternamn'])+'",'+
			'"'+(
				person['Kön'] == 'Man' || person['Kön'] == 'Mann' ? 'm' : (
					person['Kön'] =='Kvinne' ? 'k' : person['Kön']
				)
			)+'",'+
			'"'+(Number(person['Födelseår']) && Number(person['Födelseår']) > 0 ? person['Födelseår'] : 'null')+'",'+
			'"'+mysql_real_escape_string(person['Födelseort'])+'",'+
			'"'+mysql_real_escape_string(person.Personalia)+'",'+
			'"'+mysql_real_escape_string(person.Bild)+'"'+
		')'
	;
	connection.query(query, function(err) {
		if (err) {
			console.log(err);
			console.log(query);
		}
	});
};

_.each(persons, processPerson);

var processText = function(text) {
	return text.split('\n').join(' ');
}

_.each(legends, function(legend, index) {
//	var collectorId = Number(legend.PersonId_Uppt.replace(/p|P/, ''));
//	var informatId = Number(legend.PersonId_Inf.replace(/p|P/, ''));
	var categories = legend['Klassificering'].split(';');
	var collectorIds = legend['PersonId-Uppt'].split(' ').join('').split(',');
	var informatIds = legend['PersonId-Inf'].split(' ').join('').split(',');

	var query = 'INSERT INTO records ('+
		'title, '+
		'text, '+
		'type, '+
		'year, '+
		'archive, '+
		'archive_id, '+
		'archive_page, '+
		'source, '+
		'comment, '+
		'country) VALUES ('+
			'"'+mysql_real_escape_string(legend.Titel)+'", '+
			'"'+mysql_real_escape_string(processText(legend.Text))+'", '+
			'"'+mysql_real_escape_string(legend.Materialkategori.toLowerCase())+'", '+
			(legend['Uppteckningsår'] == '' ? 'null' : Number(legend['Uppteckningsår']) ? Number(legend['Uppteckningsår']) : 'null')+', '+
			'"'+mysql_real_escape_string(legend.Arkiv)+'", '+
			'"'+mysql_real_escape_string(legend['Acc. nr'])+'", '+
			(legend['Sid. nr'] > 0 ? '"'+legend['Sid. nr']+'"' : 'null')+', '+
			'"'+mysql_real_escape_string(legend['Ev. tryckt källa'])+'", '+
			'"'+mysql_real_escape_string(legend.Kommentar)+'", '+
			'"norway"'+
		')'
	;

	connection.query(query, function(recordInsertErr, result) {
		if (recordInsertErr) {
			console.log(recordInsertErr);
			console.log(query);

			return;
		}

		var id = result.insertId;

		if (categories.length > 0) {
			_.each(categories, function(category) {
				console.log('Insert category relation');

				var query = 'INSERT INTO records_category (record, category) VALUES ('+
					id+', '+
					'"'+category+'")'
				;
				connection.query(query, function(err) {
					if (err) {
						console.log(err);
						console.log(query);
					}
				});
			})
		}

		if (collectorIds.length > 0) {
			_.each(collectorIds, function(collector) {
				console.log('Insert collector relation');

				var collectorId = collector;

				if (collectorId) {
					legendPersons.push({
						legend: id,
						person: collectorId,
						relation: 'c'
					});
					var query = 'INSERT INTO records_persons (record, person, relation) VALUES ('+
						id+', '+
						'"'+collectorId+'", '+
						'"c")'
					;
					connection.query(query, function(err) {
						if (err) {
							console.log(err);
							console.log(query);
						}
					});
				}
			})
		}

		if (informatIds.length > 0) {
			_.each(informatIds, function(informant) {
				console.log('Insert informant relation');

				var informatId = informant;

				if (informatId) {
					legendPersons.push({
						legend: id,
						person: informatId,
						relation: 'i'
					});
					var query = 'INSERT INTO records_persons (record, person, relation) VALUES ('+
						id+', '+
						'"'+informatId+'", '+
						'"i")'
					;
					connection.query(query, function(err) {
						if (err) {
							console.log(err);
							console.log(query);
						}
					});

				}
			})
		}

		var sockenIds = legend.StedsID.split(',');

		if (sockenIds.length > 0) {
			_.each(sockenIds, function(socken) {
				console.log('Insert place relation');

				var sockenId = Number(socken)+20000;

				if (sockenId) {		
					legendPlaces.push({
						legend: id,
						place: sockenId
					});
					var query = 'INSERT INTO records_places (record, place) VALUES ('+
						id+', '+
						sockenId+')'
					;
					connection.query(query, function(err) {
						if (err) {
							console.log(err);
							console.log(query);
						}
					});
				}
			})
		}


		if (legend.Bildnr != '') {
			var images = legend.Bildnr.split(' ').join('').split(';');

			_.each(images, function(image) {
				console.log('Insert media relation');

				var query = 'INSERT INTO media (source, type) VALUES ('+
					'"'+image+'", '+
					'"image")'
				;
				connection.query(query, function(err, mediaQueryResult) {
					if (err) {
						console.log(err);
						console.log(query);

						return;
					}

					var mediaId = mediaQueryResult.insertId;

					var query = 'INSERT INTO records_media (record, media) VALUES ('+
						id+', '+
						mediaId+')'
					;
					connection.query(query, function(err) {
						if (err) {
							console.log(err);
							console.log(query);
						}
					});
				});
			});
		}

		console.log('insertId: '+id);
	});
});