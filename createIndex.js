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
					archive: {
						properties: {
							page: {
								type: 'integer'
							}
						}
					},
					persons: {
						type: 'nested',
						properties: {
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
});
