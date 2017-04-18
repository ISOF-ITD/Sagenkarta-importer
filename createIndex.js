var _ = require('underscore');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
	host: 'localhost:9200'
});

client.indices.create({
	index: 'sagenkarta',
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
						analyzer: 'swedish'
					},
					archive: {
						properties: {
							page: {
								type: 'integer'
							}
						}
					},
					type: {
						type: 'text',
						analyzer: 'swedish'
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
									name: {
										type: 'string',
										index: 'not_analyzed'
									},
									harad: {
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
			}
		}
	}
}, function(err) {
	if (err) {
		console.log(err);
	}

	client.indices.close({
		index: 'sagenkarta',
	}, function() {	
		client.indices.putSettings({
			index: 'sagenkarta',
			body: {
				"analysis": {
					"filter": {
						"swedish_stop": {
							"type":       "stop",
							"stopwords":  "_swedish_" 
						},
						"swedish_stemmer": {
							"type":       "stemmer",
							"language":   "swedish"
						}
					},
					"analyzer": {
						"swedish": {
							"tokenizer":  "standard",
							"filter": [
								"lowercase",
								"swedish_stop",
								"swedish_stemmer"
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
				index: 'sagenkarta'
			})
		});
	})
});
