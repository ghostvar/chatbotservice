const knex = require('../knex');
const axios = require('axios');
const { MessageType } = require('@adiwajshing/baileys');

module.exports = async (client, message, event) => {
  try {
    const { jid } = event;
    let { conversation } = message.message;
    const incometxt = conversation || '';
    const command = incometxt.trim().split(' ')[0] || '';

    console.log(incometxt, message)

    switch(command) {
      case '!tesA':
        client.sendMessage(jid, '???', MessageType.text, { quoted: message });
        break;

      case '!tesB':
        const buttonMessage = {
            contentText: "Hi it's button message",
            footerText: 'Hello World',
            buttons: [
              {buttonId: 'id1', buttonText: {displayText: 'Button 1'}, type: 1},
              {buttonId: 'id2', buttonText: {displayText: 'Button 2'}, type: 1}
            ],
            headerType: 1
        }
        client.sendMessage(jid, buttonMessage, MessageType.buttonsMessage, { quoted: message });
        break;

      case 'verify': // force
      default:
        const data = await knex('verification').select('verification.*', 'apps.webhook_url')
        .join('apps', 'apps.id', '=', 'verification.appid')
        .where({ token: incometxt }).first();
        if(data && data.id) {
          console.log(incometxt)
          axios.get(data.webhook_url, { params: { token: data.token, client: 'WA' } });
          await client.sendMessage(jid, data.custom_txt_res || ('Nomor Berhasil Terverifikasi!' + (data.redirect ? '\n\n' + data.redirect : '')));
        }
        break;
    }
  } catch (error) {
    console.error(error);
  }
}