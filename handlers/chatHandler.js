require('dotenv').config();
const knex = require('../services/knex');
const axios = require('axios');
const { MessageType } = require('@adiwajshing/baileys');
const uuid = require('uuid');

module.exports = async (client, message, event) => {
  const { jid } = event;
  try {
    const isGroup = (jid.split('@')[1] || '') === 'g.us';
    const ownid = isGroup ? message.key.participant : jid;
    const incometxt = (message.message || {}).conversation || (message.message.extendedTextMessage || {}).text || '';
    const arg = (n) => incometxt.trim().split(' ')[n] || '';
    // console.log(jid, isGroup, incometxt, message)

    switch(arg(0)) {
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
      
      case '.saved':
        let c_save = await knex('c_save').where({ ownid });
        client.sendMessage(jid, c_save.map(r => `- ${r.key}`).join('\n'), MessageType.text, { quoted: message });
        break;

      case '.removeall':
        await knex('c_save').where({ ownid }).delete();
        client.sendMessage(jid, 'berhasil hapus semua!', MessageType.text, { quoted: message });
        break;

      case '.remove':
        await knex('c_save').where({ ownid, key: arg(1) }).delete();
        client.sendMessage(jid, 'atribut berhasil dihapus!', MessageType.text, { quoted: message });
        break;

      case '.loopformat':
        let format = incometxt.substr(arg(0).length+1);
        let listqselect = [];
        format.split(' ').map(r => {
          if(['$no'].includes(r)) { // except
          } else if(r.replace(/[^a-zA-Z0-9$]/g, "")[0] == '$') {
            let key = r.substr(1).replace(/[^a-zA-Z0-9]/g, "");
            listqselect.push(`max(case when key = '${key}' then val end) as "${key}"`); // todo: binding query
          }
        });
        let listcsave = await knex('c_save').select(knex.raw(listqselect.join(`, `))).groupBy('ownid');
        let endlist = listcsave.map((r, i) => {
          let nformat = format
          nformat = nformat.replaceAll('$no', i+1);
          for(let k in r)
            nformat = nformat.replaceAll(`$${k}`, r[k]);
          return nformat;
        }).join('\n');
        client.sendMessage(jid, endlist, MessageType.text, { quoted: message });
        break;
      
      case '.notes':
        break;

      case '.invite':
        if(arg(1)[0] == '@' || arg(1)[0] == '+') {
          if(isGroup) {
            let status = await conn.groupAdd(jid, [`${arg(1).substr(1)}@s.whatsapp.net`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        }
        break;
      
      case '.invitelink':
        const code = await client.groupInviteCode(jid);
        client.sendMessage(jid, `https://chat.whatsapp.com/${code}`, MessageType.text, { quoted: message });
        break;
      
      case '.promote':
        if(arg(1)[0] == '@' || arg(1)[0] == '+') {
          if(isGroup) {
            let status = await conn.groupMakeAdmin(jid, [`${arg(1).substr(1)}@s.whatsapp.net`]);
            console.log(status);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        }
        break;
      case '.aaa':
        console.log(ownid);
        break;

      case '.sleep':
        client.sendMessage(jid, 'Zzz... zzz... zzz....', MessageType.text, { quoted: message });
        break;

      case '.ping':
        client.sendMessage(jid, 'pong', MessageType.text, { quoted: message });
        break;

      case '.spam':
        (() => {
          let to = arg(1);
          let max = arg(2);
          console.log(message);
          let val = incometxt.substr(arg(0).length+arg(1).length+arg(2).length+2);
          if(to[0] == '@' && !isNaN(parseInt(max)) && parseInt(max) <= 50) {
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
            for(let i = 0;i < parseInt(max);i++) {
              console.log(['spamming', `${to.substr(1)}@s.whatsapp.net`, 'from', jid]);
              client.sendMessage(`${to.substr(1)}@s.whatsapp.net`, val, MessageType.text);
            }
          } else {
            client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
          }
        })()
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
        console.log([jid, message]);
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