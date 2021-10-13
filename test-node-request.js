process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
request = require('request');

request('https://frigg-test.isof.se/sagendatabas/api/records/1986/', { json: true }, (err, res, body) => {
  if (err) { return console.log(err); }
  console.log(body.url);
  console.log(body.explanation);
});
