var _ = require('underscore');
var fs = require('fs');
const elasticsearch = require('elasticsearch')

if (process.argv.length < 4) {
	console.log('node createIndex.js --host=[Elasticsearch host] --login=[Elasticsearch login] --index=[index name] --cacert=[file path]');

	return;
}

var argv = require('minimist')(process.argv.slice(2));

var esHost = (argv.host.indexOf('https://') > -1 ? 'https://' : 'http://')+(argv.login ? argv.login+'@' : '')+(argv.host.replace('http://', '').replace('https://', ''));

if (argv.nooptions) {
	var options = {};
} else {
	var options = {
	host: esHost,
	apiVersion: '7.x'
	};
}

if (argv.cacert) {
	options.ssl = {
		ca: fs.readFileSync(argv.cacert),
		rejectUnauthorized: true
	};
}

var client = new elasticsearch.Client(options);

console.log(argv.host + ' ' + argv.index);
console.log(new Date().toLocaleString());

client.indices.create({
	index: argv.index || 'sagenkarta',
	body: {
		settings: {
			"number_of_shards": 1,
			"number_of_replicas": 0,
		},
		mappings: {
			// legend: {

				properties: {
					topics_10_10: {
						type: 'nested',
						properties: {
							terms: {
								type: 'nested',
								properties: {
									term: {
										type: 'keyword',
										index: 'true'
									}
								}
							}
						}
					},
					title_topics_10_10: {
						type: 'nested',
						properties: {
							terms: {
								type: 'nested',
								properties: {
									term: {
										type: 'keyword',
										index: 'true'
									}
								}
							}
						}
					},
					topics_2_5: {
						type: 'nested',
						properties: {
							terms: {
								type: 'nested',
								properties: {
									term: {
										type: 'keyword',
										index: 'true'
									}
								}
							}
						}
					},
					title_topics_2_5: {
						type: 'nested',
						properties: {
							terms: {
								type: 'nested',
								properties: {
									term: {
										type: 'keyword',
										index: 'true'
									}
								}
							}
						}
					},
					topics_10_10_graph: {
						type: 'text',
						fielddata: 'true'
					},
					title_topics_10_10_graph: {
						type: 'text',
						fielddata: 'true'
					},
					topics_2_5_graph: {
						type: 'text',
						fielddata: 'true'
					},
					title_topics_2_5_graph: {
						type: 'text',
						fielddata: 'true'
					},
					id: {
						type: 'text',
						fielddata: 'true'
					},
					year: {
						type: 'date'
					},
					title: {
						type: 'text',
						analyzer: 'swedish',
						fields: {
							raw: {
								type: 'text'
							}
						}
					},
					text: {
						type: 'text',
						analyzer: 'swedish',
						term_vector: 'with_positions_offsets',
						fields: {
							raw: {
								type: 'keyword',
								index: 'true',
								ignore_above: 32760
							}
						}
					},
					archive: {
						properties: {
							page: {
								type: 'long'
							}
						}
					},
					materialtype: {
						type: 'text',
						fielddata: 'true'
					},
					taxonomy: {
						properties: {
							category: {
								type: 'keyword',
								index: 'true'
							},
							name: {
								type: 'keyword',
								index: 'true'
							},
							type: {
								type: 'keyword',
								index: 'true'
							}
						}
					},
					persons: {
						type: 'nested',
						include_in_root: true,
						properties: {
							id: {
								type: 'keyword',
								index: 'true'
							},
							name: {
								type: 'text',
								analyzer: 'swedish',
								fields: {
									raw: {
										type: 'text',
										fielddata: true
									}
								},
								copy_to: 'search_other'
							},
							gender: {
								type: 'keyword',
								index: 'true'
							},
							relation: {
								type: 'keyword',
								index: 'true'
							},
							birth_year: {
								type: 'date'
							},
							home: {
								type: 'nested',
								include_in_root: true,
								properties: {
									location: {
										type: 'geo_point'
									},
									id: {
										type: 'keyword',
										index: 'true'
									},
									name: {
										type: 'keyword',
										index: 'true',
										copy_to: 'search_other'
									},
									harad: {
										type: 'keyword',
										index: 'true',
										copy_to: 'search_other'
									},
									harad_id: {
										type: 'keyword',
										index: 'true'
									},
									lm_id: {
										type: 'text',
										fielddata: 'true'
									},
									landskap: {
										type: 'keyword',
										index: 'true',
										copy_to: 'search_other'
									},
									county: {
										type: 'keyword',
										index: 'true',
										copy_to: 'search_other'
									},
									type: {
										type: 'keyword',
										index: 'true'
									}
								}
							}
						}
					},
					places: {
						type: 'nested',
						properties: {
							location: {
								type: 'geo_point'
							},
							id: {
								type: 'keyword',
								index: 'true'
							},
							name: {
								type: 'keyword',
								index: 'true',
								copy_to: 'search_other'
							},
							harad: {
								type: 'keyword',
								index: 'true',
								copy_to: 'search_other'
							},
							harad_id: {
								type: 'keyword',
								index: 'true'
							},
							lm_id: {
								type: 'text',
								fielddata: 'true'
							},
							landskap: {
								type: 'keyword',
								index: 'true',
								copy_to: 'search_other'
							},
							county: {
								type: 'keyword',
								index: 'true',
								copy_to: 'search_other'
							},
							type: {
								type: 'text',
								fielddata: 'true'
							},
						}
					},
					media: {
						type: 'nested',
						properties: {
							source: {
								type: 'text',
								fields: {
									keyword: {
										type: 'keyword',
										ignore_above: 256
									}
								}
							},
							//source: {
								//type: 'keyword',
								//index: 'true',
								//ignore_above: 32760
							//},
							timeslots: {
								type: 'nested',
								properties: {
									text: {
										type: 'text',
										analyzer: 'swedish',
										term_vector: 'with_positions_offsets',
										fields: {
											raw: {
												type: 'keyword',
												index: 'true',
												ignore_above: 32760
											}
										}
									},
								}
							}
						}
					}
				}
			// }
		}
	}
}, function(err) {
	if (err) {
		console.log(err);
	}

	client.indices.close({
		index: argv.index || 'sagenkarta',
	}, function() {
		client.indices.putSettings({
			index: argv.index || 'sagenkarta',
			body: {

				"analysis": {

					"filter": {
						"swedish_stop": {
							"type": "stop",
							"stopwords": "_swedish_"
						},
						"swedish_stemmer": {
							"type": "stemmer",
							"language": "swedish"
						}
					},

					"analyzer": {
						"swedish": {
							"tokenizer": "standard",
							"filter": [
								"lowercase",
								"swedish_stop",
								"swedish_stemmer"
							],
							"char_filter": [
								"html_strip"
							]
						}
					}

				}

			}
		}, function(settingsErr) {
			if (settingsErr) {
				console.log(settingsErr);
			}
			client.indices.open({
				index: argv.index || 'sagenkarta'
			})
		});
	})
});
console.log('End ' + new Date().toLocaleString());
