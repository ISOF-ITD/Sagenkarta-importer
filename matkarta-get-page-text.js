var fs = require('fs');
var _ = require('underscore');
var request = require('request');
var JSDOM = require('jsdom').JSDOM;

var config = require('./config');

if (process.argv.length < 3) {
	console.log('node matkarta-import.js [input matkarta.json] [output matkarta.json]');

	return;
}

var matkartaFileContent = fs.readFileSync(process.argv[2]);

var matkartaData = JSON.parse(matkartaFileContent);

var currentItem = 0;

var saveAndQuit = function() {
	if (process.argv[3]) {
		fs.writeFile(process.argv[3], JSON.stringify(matkartaData, null, 2));
	}
}

var processItem = function() {
	var item = matkartaData[currentItem];

	var sitevisionUrl = item['Länk i Sitevision'];

	if (sitevisionUrl.indexOf('kokboken') == -1) {
		request(sitevisionUrl, function(error, response, html) {
			console.log(item['Titel']);
			var dom = new JSDOM(html)

			var document = dom.window.document;

			var rubrik = document.getElementById('Rubrik');

			mainElement = rubrik.parentElement.parentElement;

			item.text = mainElement.getElementsByTagName('p')[0].textContent;

			if (matkartaData.length-1 > currentItem) {
				currentItem++;

				processItem();
			}
			else {
				saveAndQuit();
			}
		});
	}
	else {
		if (matkartaData.length-1 > currentItem) {
			currentItem++;

			processItem();
		}
		else {
			saveAndQuit();
		}
	}
}

processItem();
