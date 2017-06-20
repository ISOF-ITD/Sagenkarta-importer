var _ = require('underscore');
var elasticsearch = require('elasticsearch');

var esHost = 'https://'+(process.argv[4] ? process.argv[4]+'@' : '')+(process.argv[3] || 'localhost:9200');

var client = new elasticsearch.Client({
	host: esHost
});

client.indices.create({
	index: process.argv[2] || 'sagenkarta',
	body: {
		mappings: {
			legend: {
				properties: {
					year: {
						type: 'date'
					},
					title: {
						type: 'text',
						analyzer: 'swedish'
					},
					text: {
						type: 'text',
						analyzer: 'swedish',
						term_vector: 'with_positions_offsets'
					},
					archive: {
						properties: {
							page: {
								type: 'integer'
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
								type: 'string',
								index: 'not_analyzed'
							},
							name: {
								type: 'string',
								index: 'not_analyzed'
							}
						}
					},
					persons: {
						type: 'nested',
						properties: {
							id: {
								type: 'string',
								index: 'not_analyzed'
							},
							name: {
								type: 'string',
								index: 'not_analyzed'
							},
							name_analysed: {
								type: 'string',
								analyzer: 'swedish'
							},
							gender: {
								type: 'string',
								index: 'not_analyzed'
							},
							relation: {
								type: 'string',
								index: 'not_analyzed'
							},
							birth_year: {
								type: 'date'
							},
							home: {
								properties: {
									location: {
										type: 'geo_point'
									},
									id: {
										type: 'string',
										index: 'not_analyzed'
									},
									name: {
										type: 'string',
										index: 'not_analyzed'
									},
									harad: {
										type: 'string',
										index: 'not_analyzed'
									},
									harad_id: {
										type: 'string',
										index: 'not_analyzed'
									},
									landskap: {
										type: 'string',
										index: 'not_analyzed'
									},
									county: {
										type: 'string',
										index: 'not_analyzed'
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
								type: 'string',
								index: 'not_analyzed'
							},
							name: {
								type: 'string',
								index: 'not_analyzed'
							},
							harad: {
								type: 'string',
								index: 'not_analyzed'
							},
							harad_id: {
								type: 'string',
								index: 'not_analyzed'
							},
							landskap: {
								type: 'string',
								index: 'not_analyzed'
							},
							county: {
								type: 'string',
								index: 'not_analyzed'
							}
						}
					},
					topics: {
						type: 'nested',
						properties: {
							terms: {
								type: 'nested',
								properties: {
									term: {
										type: 'string',
										index: 'not_analyzed'
									}
								}
							}
						}
					},
					title_topics: {
						type: 'nested',
						properties: {
							terms: {
								type: 'nested',
								properties: {
									term: {
										type: 'string',
										index: 'not_analyzed'
									}
								}
							}
						}
					}
				}
			}
		}
	}
}, function(err) {
	if (err) {
		console.log(err);
	}

	client.indices.close({
		index: process.argv[2] || 'sagenkarta',
	}, function() {	
		client.indices.putSettings({
			index: process.argv[2] || 'sagenkarta',
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
				index: process.argv[2] || 'sagenkarta'
			})
		});
	})
});
