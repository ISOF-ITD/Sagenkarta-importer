var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

if (process.argv.length < 4) {
	console.log('node matkarta-import.js [matkarta.json] [action]');

	return;
}

var action = process.argv[3];

if (action == 'categories') {
	var matkartaFileContent = fs.readFileSync(process.argv[2]);

	var matkartaData = JSON.parse(matkartaFileContent);

	var questionLists = _.uniq(_.pluck(matkartaData, 'Frågelista').concat(_.pluck(matkartaData, 'Kategori')));

	console.log(questionLists);
}
if (action == 'records') {
	var matkartaFileContent = fs.readFileSync(process.argv[2]);

	var matkartaData = JSON.parse(matkartaFileContent);

	var connection = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: '',
		database: 'svenska_sagor'
	});

	connection.connect();

	var currentItem = 0;

	var importItem = function() {
		var item = matkartaData[currentItem];

		connection.query('INSERT INTO records (title, year, archive_id, country, type) VALUES ('+
			'"'+item.Titel+'", '+
			(Boolean(Number(item['År'])) ? item['År'] : 'null')+', '+
			'"'+item['Acc.nr.']+'", '+
			'"sweden", '+
			'"matkarta")'
		, function (error, results, fields) {
			var recordId = results.insertId;

			if (item['Frågelista'] != '' && item['Frågelista'] != 'Nej') {
				connection.query('INSERT INTO records_category (record, category) VALUES ('+recordId+', "'+item['Frågelista']+'")');
			}
			
			connection.query('INSERT INTO records_category (record, category) VALUES ('+recordId+', "'+(item['Kategori'] == 'Bröd' ? 'MK-3' : item['Kategori'] == 'Kokbok' ? 'MK-10' : '')+'")');
			/*
			if (Boolean(Number(item['UpptId']))) {
				connection.query('INSERT INTO records_persons (record, person, relation) VALUES ('+recordId+', "'+(item['UpptId'])+'", "c")');
			}
			*/
			if (Boolean(Number(item['Sockenid']))) {
				connection.query('INSERT INTO records_places (record, place) VALUES ('+recordId+', '+item['Sockenid']+')');
			}
			
			connection.query('INSERT INTO records_metadata (record, type, value) VALUES ('+recordId+', "sitevision_url", "'+item['Länk i Sitevision']+'")');

			console.log('Insert: '+item['Titel']);

			if (matkartaData.length-1 > currentItem) {
				currentItem++;

				importItem();
			}
		});
	}

	importItem();
}