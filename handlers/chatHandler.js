const knex = require('../services/knex');
const axios = require('axios');
const { MessageType } = require('@adiwajshing/baileys');
const uuid = require('uuid');

module.exports = async (client, message, event) => {
  const { jid } = event;
  try {
    const isGroup = (jid.split('@')[1] || '') === 'g.us';
    let { conversation } = message.message;
    const ownid = isGroup ? message.key.participant : jid;
    const incometxt = conversation || '';
    const arg = (n) => incometxt.trim().split(' ')[n] || '';
    // console.log(jid, isGroup, incometxt, message)

    switch(arg(0)) {
      case '.removeall':
        await knex('c_save').where({ ownid }).delete();
        client.sendMessage(jid, 'berhasil hapus semua!', MessageType.text, { quoted: message });
        break;

      case '.remove':
        await knex('c_save').where({ ownid, key: arg(1) }).delete();
        client.sendMessage(jid, 'key berhasil dihapus!', MessageType.text, { quoted: message });
        break;

      case '.saved':
        let c_save = await knex('c_save').where({ ownid });
        client.sendMessage(jid, c_save.map(r => `- ${r.key}`).join('\n'), MessageType.text, { quoted: message });
        break;

      case '.saved':
        let c_save = await knex('c_save').where({ ownid });
        client.sendMessage(jid, c_save.map(r => `- ${r.key}`).join('\n'), MessageType.text, { quoted: message });
        break;
  
      case '.save':
        let key = arg(1);
        let val = incometxt.substr(arg(0).length+arg(1).length+2);
        // console.log([name, value, jid, ownid]);
        if(key && val && ownid) {
          await knex('c_save').insert({ ownid, key, val });
          client.sendMessage(jid, 'tersimpan!', MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        }
        break;
      
      case '.list':
        let format = incometxt.substr(arg(0).length+1);
        let listqselect = format.split(' ').map((r, i) => {
          if(r == '$no') {
            return `'${i+1}'`;
          } else if(r == '$no.') {
            return `'${i+1}.'`;
          } else if(r[0] == '$') {
            return `max(case when key = '${r.substr(1)}' then val end)`; // todo: binding query
          } else return `'${r}'`;
        });
        let listcsave = await knex('c_save').select(knex.raw(`concat(${listqselect.join(`, ' ', `)}) as txt`)).groupBy('ownid');
        client.sendMessage(jid, listcsave.map(r => `${r.txt}\n`).join(''), MessageType.text, { quoted: message });
        break;
      
      case '.notes':
        break;

      case '.ping':
        client.sendMessage(jid, 'pong', MessageType.text, { quoted: message });
        break;

      case '.tes':
          client.sendMessage(jid, {
            contentText: "Hi it's button message",
            footerText: 'Hello World',
            buttons: [
              {buttonId: 'id1', buttonText: {displayText: 'Button 1'}, type: 1},
              {buttonId: 'id2', buttonText: {displayText: 'Button 2'}, type: 1}
            ],
            headerType: 1
          }, MessageType.buttonsMessage, { quoted: message });
        break;

      case 'verify': // force
      default:
        const verify = await knex('verification').select('verification.*', 'apps.webhook_url')
        .join('apps', 'apps.id', '=', 'verification.appid')
        .where({ token: incometxt }).first();
        if(verify && verify.id) {
          const chatid = uuid.v1();
          await knex('app_chats').insert({ appid: verify.appid, chatid, jid });
          await client.sendMessage(jid, verify.custom_txt_res || ('Nomor Berhasil Terverifikasi!' + (verify.redirect ? '\n\n' + verify.redirect : '')), MessageType.text);
          axios.get(verify.webhook_url, { params: { chatid, token: verify.token, client: 'WA' } });
        }
        break;
    }
  } catch (error) {
    console.error(error);
    client.sendMessage(jid, 'terjadi kesalahan!', MessageType.text, { quoted: message });
  }
}