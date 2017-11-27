var fs = require('fs');
var _ = require('underscore');
var mysql = require('mysql');

var config = require('./config');

if (process.argv.length < 4) {
	console.log('node matkarta-import.js [matkarta.json] [action]');

	return;
}

var action = process.argv[3];

if (action == 'records') {
	var matkartaFileContent = fs.readFileSync(process.argv[2]);

	var matkartaData = JSON.parse(matkartaFileContent);

	var connection = mysql.createConnection({
		host: config.host,
		user: config.user,
		password: config.password,
		database: config.database
	});

	connection.connect(function(err) {
		if (err) {
			console.error('error connecting: ' + err.stack);
			return;
		}

		console.log('connected as id ' + connection.threadId);
	});

	var currentItem = 0;

	var importItem = function() {
		var item = matkartaData[currentItem];

		var title = item.Titel_Allt;
		title = title.replace('Frgl. ', '');

		title = title.substr(0, 1).toUpperCase()+title.substr(1);

		connection.query('INSERT INTO records (title, year, archive, archive_id, country, type) VALUES ('+
			connection.escape(title)+', '+
			(Boolean(Number(item['UrsprungsårFrån'])) ? item['UrsprungsårFrån'] : 'null')+', '+
			'"DFU", '+
			'"'+item['Acc_nr_ny']+'", '+
			'"sweden", '+
			'"matkarta")'
		, function (error, results, fields) {
			if (error) {
				console.log(error);
			}
			var recordId = results.insertId;

			connection.query('INSERT INTO records_category (record, category) VALUES ('+recordId+', "T16")');
			
			connection.query('INSERT INTO records_category (record, category) VALUES ('+recordId+', "MK-3")');

			_.each(item.persons, function(person) {
				connection.query('INSERT INTO records_persons (record, person, relation) VALUES ('+recordId+', "'+('acc'+person.id)+'", "'+(person.role == '1' ? 'c' : 'i')+'")');
			});

			if (Boolean(Number(item['sockenId']))) {
				connection.query('INSERT INTO records_places (record, place) VALUES ('+recordId+', '+item['sockenId']+')');
			}
			
			connection.query('INSERT INTO records_metadata (record, type, value) VALUES ('+recordId+', "filemaker_id.", "'+item['!Acc']+'")');
			
			connection.query('INSERT INTO records_media (record, type, source) VALUES ('+recordId+', "pdf", "'+item['media'][0]+'")');

			console.log('Insert: '+title);

			if (matkartaData.length-1 > currentItem) {
				currentItem++;

				importItem();
			}
		});
	}

	importItem();
}