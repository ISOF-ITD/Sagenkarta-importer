var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var legendsData = fs.readFileSync(process.argv[2]);

var legends = JSON.parse(legendsData);

console.log('legends: '+legends.length);

var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'svenska_sagor'
});

connection.connect();

var legendIndex = 0;

function updateDate() {
	var legend = legends[legendIndex];

	var id = legendIndex+1;
	if (legend.year && legend.year != '') {	
		var query = 'update records set year = \''+legend.year+'-01-01\' where id ='+id;
	}
	else {
		var query = 'update records set year = null where id ='+id;
	}

	console.log(query);
	connection.query(query, function(error, result) {
		if (error) {
			console.log(error);
			return;
		}

		if (legendIndex < legends.length) {
			legendIndex++;
			updateDate();
		}
	});
}

updateDate();

//connection.end();