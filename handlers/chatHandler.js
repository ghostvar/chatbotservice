const knex = require('../services/knex');
const axios = require('axios');
const { MessageType } = require('@adiwajshing/baileys');
const uuid = require('uuid');

module.exports = async (client, message, event) => {
  try {
    const { jid } = event;
    const isGroup = (jid.split('@')[1] || '') === 'g.us';
    let { conversation } = message.message;
    const incometxt = conversation || '';
    const command = incometxt.trim().split(' ')[0] || '';

    // console.log(jid, isGroup, incometxt, message)

    switch(command) {
      case '.notes':
        
        break;

      case '.ping':
        client.sendMessage(jid, 'Pyon', MessageType.text, { quoted: message });
        break;

      case '.tes':
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
        console.log(incometxt);
        if(data && data.id) {
          const chatid = uuid.v1();
          await knex('app_chats').insert({ appid: data.appid, chatid, jid });
          await client.sendMessage(jid, data.custom_txt_res || ('Nomor Berhasil Terverifikasi!' + (data.redirect ? '\n\n' + data.redirect : '')), MessageType.text);
          axios.get(data.webhook_url, { params: { chatid, token: data.token, client: 'WA' } });
        }
        break;
    }
  } catch (error) {
    console.error(error);
  }
}