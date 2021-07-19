require('dotenv').config();
const express = require('express');
const app = express();

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('Hello, Happy World!')
});

app.use('/verify', require('./handlers/apiHandler'));

app.listen(process.env.APP_PORT, function() {
  console.log('[SERVER] Expressjs Running!')
});