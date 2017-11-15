var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var config = require('./config');

if (process.argv.length < 3) {
	console.log('node mysql-nfs-import-places.js [place data file]');

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

var placeData = fs.readFileSync(process.argv[2]);

var places = JSON.parse(placeData);

console.log('places: '+places.length);

var connection = mysql.createConnection({
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database
});

connection.connect();

_.each(places, function(place, index) {
	var id = (Number(place.Id)+20000);

	var query = 'INSERT INTO socken ('+
		'id, '+
		'name, '+
		'fylke, '+
		'lat, '+
		'lng, '+
		'type) VALUES ('+
			id+', '+
			'"'+mysql_real_escape_string(place.Sted)+'", '+
			'"'+mysql_real_escape_string(place.Fylke)+'", '+
			place.Lat+', '+
			place.Lng+', '+
			'"nfs"'+
		')'
	;

	connection.query(query, function(placeInsertErr, result) {
		if (placeInsertErr) {
			console.log(placeInsertErr);
			console.log(query);

			return;
		}

		console.log('insertId: '+id);
	});
});