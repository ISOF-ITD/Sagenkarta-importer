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
					transcriptiondate: {
						type: 'date'
					},
					approvedate: {
						type: 'date'
					},
					id: {
						// Type text to be able to search part of id, for example without "page number part"
						type: 'text',
						fielddata: 'true',
						fields: {
							keyword: {
							  type: 'keyword'
							}
						}
					},
					year: {
						type: 'date'
					},
					title: {
						type: 'text',
						analyzer: 'swedish',
						fields: {
							raw: {
								type: 'text',
								analyzer: 'simple'
							}
						}
					},
					changedate: {
						type: 'date'
					},
					comments: {
						type: 'text',
						analyzer: 'swedish',
						fields: {
							raw: {
								type: 'text',
								analyzer: 'simple'
							}
						}
					},
					contents: {
						type: 'text',
						analyzer: 'swedish',
						fields: {
							raw: {
								type: 'text',
								analyzer: 'simple'
							}
						}
					},
					copyrightlicense: {
						type: 'text',
						index: 'true'
					},
					headwords: {
						type: 'text',
						analyzer: 'swedish',
						fields: {
							raw: {
								type: 'text',
								analyzer: 'simple'
							}
						}
					},
					language: {
						type: 'text',
						fields : {
							keyword: {
								type : 'keyword',
								index: 'true'
							}
						}
					},
					numberofonerecord: {
						type: 'long'
					},
					numberoftranscribedonerecord: {
						type: 'long'
					},
					publishstatus: {
						type: 'keyword',
						index: 'true'
					},
					recordtype: {
						type: 'keyword',
						index: 'true'
					},
					// För copy_to
 					search_other: {
						type: 'text',
						fields: {
						  keyword: {
							type: 'keyword',
						  }
						}
					  },
 					source: {
						type: 'text',
						fields: {
						  keyword: {
							type: 'keyword',
						  }
						}
					  },
					text: {
						type: 'text',
						analyzer: 'swedish',
						term_vector: 'with_positions_offsets',
						fields: {
							raw: {
								type: 'text',
								analyzer: 'simple'
							}
						}
					},
					transcribedby: {
						type: 'text',
						//index: 'true',
						fields: {
							keyword: {
							  type: 'keyword',
							  ignore_above: 256
							}
						}
					},
					transcriptiondate: {
						type: 'date'
					},
					transcriptionstatus: {
						type: 'keyword',
						index: 'true'
					},
					transcriptiontype: {
						type: 'keyword',
						index: 'true'
					},
					update_status: {
						type: 'keyword',
						index: 'true'
					},
					archive: {
						properties: {
							archive: {
								type: 'text'
							},
							archive_id: {
								type: 'text'
							},
							archive_id_row: {
								// Type text to be part of full text search
								type: 'text',
								fields: {
									keyword: {
									  type: 'keyword',
									}
								}
							},
							archive_row: {
								type: 'long'
							},
							archive_org: {
								type: 'keyword',
								index: 'true'
							},
							country: {
								type: 'text',
								index: 'true'
							},
							page: {
								// Type text to be able to register non-numeric pages, like 10A, 10B
								type: 'text',
								fields: {
									// Type long to be able to sort as a numeric value
									long: {
									  type: 'long',
									  // Ignore malformed numbers (as field is a character field for now: to handle pages like 10A, 10B)
									  ignore_malformed: 'true'
									}
								}
							},
							total_pages: {
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
										analyzer: 'simple',
										fielddata: true
									}
								},
								copy_to: 'search_other'
							},
							// name_analysed skapas som en kopia av name vid elasticsearch-import.js och ska ha type keyword i mapping (som den verkat fått som default)
							// Förslag: ta bort name_analysed och lägg till type keyword på fält "name" i mapping (name.keyword) - Ändra också i ES-api views.py
							name_analysed: {
								type: 'text',
								fields: {
								  keyword: {
									type: 'keyword',
									ignore_above: 256
								  }
								}
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
							birthplace: {
								type: 'text',
								fields: {
								  keyword: {
									type: 'keyword',
									ignore_above: 256
								  }
								}
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
									fylke: {
										type: 'keyword',
										index: 'true'
									},
									type: {
										type: 'keyword',
										index: 'true'
									},
									comment: {
										type: 'text'
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
							fylke: {
								type: 'text',
								fields: {
								  keyword: {
									type: 'keyword',
									ignore_above: 256
								  }
								}
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
							fylke: {
								type: 'keyword',
								index: 'true'
							},
							type: {
								type: 'keyword',
								index: 'true'
							},
							comment: {
								type: 'text'
							}
						}
					},
					media: {
						// Idag utan nested MEN krävs för sökbarhet där varje rad (objekt) är oberoende av varandra
						//type: 'nested',
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
							store: {
								type: 'keyword',
								index: 'true'
							},
							title: {
								type: 'text',
								analyzer: 'swedish',
								term_vector: 'with_positions_offsets',
								fields: {
									raw: {
										type: 'text',
										analyzer: 'simple'
									}
								}
							},
							text: {
								type: 'text',
								analyzer: 'swedish',
								term_vector: 'with_positions_offsets',
								fields: {
									raw: {
										type: 'text',
										analyzer: 'simple'
									}
								}
							},
							type: {
								type: 'keyword',
								index: 'true'
							},
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
									}
								}
							}
						}
					},
					metadata: {
						type: 'nested',
						properties: {
							type: {
								type: 'keyword',
								index: 'true'
							},
							value: {
								type: 'text',
								fields : {
									keyword: {
										type : 'keyword',
										index: 'true'
									}
								}
							}
						}
					},
					physical_media: {
						type: 'nested',
						properties: {
							specified_type: {
								type: 'keyword',
								index: 'true'
							},
							type: {
								type: 'keyword',
								index: 'true'
							},
							media: {
								type: 'keyword',
								index: 'true'
							},
							count: {
								type: 'long',
								index: 'true'
							},
							count_description: {
								type: 'text',
								index: 'false'
							},
							language: {
								type: 'text',
								fields : {
									keyword: {
										type : 'keyword',
										index: 'true'
									}
								}
							},
							questionnaire: {
								type: 'keyword',
								index: 'true'
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
							"type": "custom",
							"tokenizer": "whitespace",
							"char_filter": [
							  "add_whitespace_next_to_three_hashes",
							  "punctuation_removal"
							],
							"filter": [
							  "lowercase",
							  "swedish_stop",
							  "swedish_stemmer"
							]
						}
					},
					"char_filter": {
						"add_whitespace_next_to_three_hashes": {
						  "type": "pattern_replace",
						  "pattern": "###",
						  "replacement": " ### "
						},
						"punctuation_removal": {
						  "type": "pattern_replace",
						  "pattern": "[^åöäüëïÅÖÄÜËÏáéíóúÁÉÍÓÚàèìòùâêîôûÀÈÌÒÙÂÊÎÔÛẞßa-zA-Z0-9# ]",
						  "replacement": ""
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
