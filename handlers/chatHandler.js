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

    switch(arg(0)) {
      case '.save':
        let key = arg(1);
        let val = incometxt.substr(arg(0).length+arg(1).length+2);
        if(key && val && ownid) {
          let c_save = await knex('c_save').where({ ownid, key }).first();
          if(c_save) {
            await knex('c_save').where({ ownid, key }).update({ val, updated_at: knex.fn.now() });
          } else {
            await knex('c_save').insert({ ownid, key, val, created_at: knex.fn.now(), updated_at: knex.fn.now() });
          }
          client.sendMessage(jid, 'tersimpan!', MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        }
        break;

      case '.show':
        (async () => {
          let key = arg(1);
          let c_save = await knex('c_save').where({ ownid, key }).first();
          client.sendMessage(jid, c_save.val, MessageType.text, { quoted: message });
        })();
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

      case '.addsesi':
        (async () => {
          let sesi = arg(1);
          if(sesi) {
            let c_sesi = await knex('c_sesi').where({ jid, sesi }).first();
            if(c_sesi) {
              /**
               * todo: uuid instean of sesi, sesi sebagai keterangan saja
               * todo: ubah atribut
               *  - kunci hadir sesi hanya berlaku hari ini, 24jam, atau 1jam
               *  - reply ketika presensi
               */
              await knex('c_sesi').where({ jid, sesi }).update({ updated_at: knex.fn.now() });
            } else {
              await knex('c_sesi').insert({ jid, sesi, created_at: knex.fn.now(), updated_at: knex.fn.now() });
            }
            client.sendMessage(jid, 'tersimpan!', MessageType.text, { quoted: message });
          } else {
            client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
          }
        })();
        break;
      case '.listsesi':
        let c_sesi = await knex('c_sesi').where({ jid }).first();
        if(c_sesi.length > 0) {
          client.sendMessage(jid, c_sesi.map(r => `- ${r.sesi}`).join('\n'), MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, 'tidak ada sesi tersimpan!', MessageType.text, { quoted: message });
        }
        break;
      case '.presensi':
      case '.hadiran':
      case '.hadir':
        (async () => {
          let sesi = arg(1);
          if(sesi) {
            let c_sesi = await knex('c_sesi').where({ jid, sesi }).first();
            if(c_sesi) {
              let c_sesi_hadir = await knex('c_sesi_hadir').where({ jid, sesi, ownid }).first();
              if(c_sesi_hadir) {
                await knex('c_sesi_hadir').where({ jid, sesi, ownid }).update({ updated_at: knex.fn.now() });
              } else {
                await knex('c_sesi_hadir').insert({ jid, sesi, ownid, created_at: knex.fn.now(), updated_at: knex.fn.now() });
              }
              client.sendMessage(jid, 'tersimpan', MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, `sesi ${sesi} tidak ditemukan!`, MessageType.text, { quoted: message });
            }
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        })();
        break;

      case '.loopsesi':
        (async () => {
          let sesi = arg(1);
          if(sesi) {
            let c_sesi = await knex('c_sesi').where({ jid, sesi }).first();
            if(c_sesi) {
              let format = incometxt.substr(arg(0).length+arg(1).length+2);
              let listqselect = [];
              let keys = [];
              format.split(' ').map(r => {
                if(['$no'].includes(r)) { // except
                } else if(r.replace(/[^a-zA-Z0-9$]/g, "")[0] == '$') {
                  let key = r.substr(1).replace(/[^a-zA-Z0-9]/g, "");
                  keys.push(key);
                  listqselect.push(knex.raw(`max(case when key = ? then val end) as "${key}"`, [ key ]));
                }
              });
              let listcsave = await knex('c_save').select(listqselect)
                .join('c_sesi_hadir', 'c_sesi_hadir.ownid', 'c_save.ownid')
                .where('c_sesi_hadir.sesi', sesi).whereIn('key', keys).groupBy('c_save.ownid');
              let endlist = listcsave.map((r, i) => {
                let nformat = format
                nformat = nformat.replaceAll('$no', i+1);
                for(let k in r)
                  nformat = nformat.replaceAll(`$${k}`, r[k]);
                return nformat;
              }).join('\n');
              client.sendMessage(jid, `${c_sesi.sesi}:\n${endlist}`, MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, `sesi ${sesi} tidak ditemukan!`, MessageType.text, { quoted: message });
            }
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        })();
        break;

      case '.loop':
      case '.loopformat':
        let format = incometxt.substr(arg(0).length+1);
        let listqselect = [];
        let keys = [];
        format.split(' ').map(r => {
          if(['$no'].includes(r)) { // except
          } else if(r.replace(/[^a-zA-Z0-9$]/g, "")[0] == '$') {
            let key = r.substr(1).replace(/[^a-zA-Z0-9]/g, "");
            keys.push(key);
            listqselect.push(knex.raw(`max(case when key = ? then val end) as "${key}"`, [ key ]));
          }
        });
        let listcsave = await knex('c_save').select(listqselect).whereIn('key', keys).groupBy('ownid');
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
        if(isGroup) {
          if(arg(1)[0] == '@' || arg(1)[0] == '+') {
            client.groupAdd(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.kick':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin && arg(1)[0] == '@' || arg(1)[0] == '+') {
            client.groupRemove(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, 'hanya admin yang bisa melakukan perintah ini!', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.kickme':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, 'heh admin gaboleh asal keluar!', MessageType.text, { quoted: message });
          } else {
            client.groupRemove(jid, [ownid]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          }
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.members':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          console.log(participants);
          let member = participants.map(r => `- ${(r.notify ? r.notify : '@'+r.id.replace('@c.us', ''))}`).join('\n');
          client.sendMessage(jid, member, MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.invitelink':
        const code = await client.groupInviteCode(jid);
        client.sendMessage(jid, `https://chat.whatsapp.com/${code}`, MessageType.text, { quoted: message });
        break;
      
      case '.promote':
        if(isGroup) {
          const { owner } = await client.groupMetadata(jid);
          if(owner.split('@')[0] == ownid.split('@')[0] && (arg(1)[0] == '@' || arg(1)[0] == '+')) { // bisa ambil dari array participants
            client.groupMakeAdmin(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else if(owner.split('@')[0] != ownid.split('@')[0]) {
            client.sendMessage(jid, 'hanya owner group yang bisa melakukan perintah ini!', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.demote':
        if(isGroup) {
          const { owner } = await client.groupMetadata(jid);
          if(owner.split('@')[0] == ownid.split('@')[0] && (arg(1)[0] == '@' || arg(1)[0] == '+')) { // bisa ambil dari array participants
            client.groupDemoteAdmin(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else if(owner.split('@')[0] != ownid.split('@')[0]) {
            client.sendMessage(jid, 'hanya owner group yang bisa melakukan perintah ini!', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.sleep':
        client.sendMessage(jid, 'Zzz... zzz... zzz....', MessageType.text, { quoted: message });
        break;

      case '.ping':
        client.sendMessage(jid, 'pong', MessageType.text, { quoted: message });
        break;

      case '.spam': // todo: tunggu respon dari sendMessage baru kirm lagi
        (() => {
          let to = arg(1);
          let max = arg(2);
          console.log(message);
          let val = incometxt.substr(arg(0).length+arg(1).length+arg(2).length+2);
          if(to[0] == '@' && !isNaN(parseInt(max)) && parseInt(max) <= 50) {
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
            for(let i = 0;i < parseInt(max);i++) {
              console.log(['spamming', `${to.substr(1)}@c.us`, 'from', jid]);
              client.sendMessage(`${to.substr(1)}@c.us`, val, MessageType.text);
            }
          } else {
            client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
          }
        })()
        break;
      
      case '.help':
        client.sendMessage(jid, 'belom ada!', MessageType.text, { quoted: message });
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