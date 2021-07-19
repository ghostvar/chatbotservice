const knex = require('../knex');
const axios = require('axios');

module.exports = async (client, message) => {
  try {
    const { type, id, from, t, sender, isGroupMsg, chat, caption, isMedia, mimetype, quotedMsg, quotedMsgObj, mentionedJidList } = message;
    let { body } = message;
    const incometxt = caption || body || '';
    const command = incometxt.toLowerCase().trim().split(' ')[0] || '';

    switch(command) {
      case 'verify':
        // force
      default:
        const data = await knex('verification').select('verification.*', 'apps.webhook_url')
        .join('apps', 'apps.id', '=', 'verification.appid')
        .where({ token: incometxt }).first();
        if(data && data.id) {
          console.log(incometxt)
          axios.get(data.webhook_url, { params: { token: data.token, client: 'WA' } });
          await client.sendText(from, data.custom_txt_res || ('Nomor Berhasil Terverifikasi!' + (data.redirect ? '\n\n' + data.redirect : '')));
        }
        break;
    }
  } catch (error) {
    console.error(error);
  }
}