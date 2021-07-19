const express = require('express');
const router = express.Router();
const knex = require('../knex');

router.get('/create', async function (req, res) {
  if(req.query.token) {
    await knex('verification').insert({ appid: 1, token: req.query.token, redirect: req.query.redirecto });
    res.send({ status: 'success', message: 'Listening for a verification!' })
  } else {
    res.send({ status: 'error', message: 'No Token Supplied!' }).statusCode(400);
  }
});

module.exports = router;