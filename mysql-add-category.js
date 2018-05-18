var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var config = require('./config');

if (process.argv.length < 3) {
	console.log('node mysql-add-category.js --input=[category input file]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var fileData = JSON.parse(fs.readFileSync(argv.input));

var connection = mysql.createConnection({
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database
});

connection.connect();

_.each(fileData, function(item) {
	if (item.id != '') {	
		var query = 'SELECT * FROM records WHERE id = "acc'+item.id+'"';

		connection.query(query, function(error, results) {
			if (error) {
	//			console.log(error);
			}
			else {
				var categoryQuery = 'INSERT INTO records_category (record, category) VALUES ("acc'+item.id+'", "dk-tattare")';
				connection.query(categoryQuery);
				console.log(categoryQuery);
	/*
				if (results.length == 0) {
					console.log(item.acc+';'+item.socken+';'+item.page+';'+item.id)
				}
	*/
			}
		});
	}
});