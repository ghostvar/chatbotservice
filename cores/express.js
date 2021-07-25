require('dotenv').config();
const express = require('express');
const app = express();
const apiHandler = require('../handlers/apiHandler');

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('Hello, Happy World!');
});

app.get('/verify', apiHandler.create);
app.get('/send-message', apiHandler.sendMessage);

app.listen(process.env.APP_PORT, function() {
  console.log('[SERVER] Expressjs Running!')
});