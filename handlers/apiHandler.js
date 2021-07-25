const Emiter = require('../services/eventEmiter');
const knex = require('../services/knex');

module.exports = {
  create: async (req, res) => {
    if(req.query.token) {
      await knex('verification').insert({ appid: 1, token: req.query.token, redirect: req.query.redirecto });
      res.json({ status: 'success', message: 'Listening for a verification!' })
    } else {
      res.status(400).json({ status: 'error', message: 'No Token Supplied!' });
    }
  },

  sendMessage: async (req, res) => {
    const { text, chatid } = req.query;
    if(!text || !chatid) {
      return res.status(400).json({ status: 'error', message: 'Bad Request!' });
    }
    try {
      const chat = await knex('app_chats').select('*').where('chatid', chatid).first();
      if(chat) {
        Emiter.emit('sendMessage', { jid: chat.jid, text });
        res.json({ status: 'success', message: 'Pesan Berhasil Di kirim!' });
      } else {
        res.status(404).json({ status: 'error', message: 'Uuid chat tidak ditemukan!' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'error', message: 'Terjadi Kesalahan!' });
    }
  }
}
