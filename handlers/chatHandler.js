require('dotenv').config();
const knex = require('../services/knex');
const axios = require('axios');
const { MessageType } = require('@adiwajshing/baileys');
const { createSticker, Sticker } = require('wa-sticker-formatter');
const uuid = require('uuid');
const URL = require("url").URL;
const fs = require('fs');

const chatHandler = async (client, message, event) => {
  const { jid } = event;
  try {
    const isGroup = (jid.split('@')[1] || '') === 'g.us';
    const ownid = isGroup ? message.key.participant : jid;
    const messageObj = message.message || {};
    const { quotedMessage } = (messageObj.extendedTextMessage || {}).contextInfo || { quotedMessage: {} };
    const incometxt = messageObj.conversation || (messageObj.imageMessage || {}).caption || (messageObj.extendedTextMessage || {}).text || (messageObj.buttonsResponseMessage || {}).selectedButtonId || '';
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
               * todo: buat tombol untuk melakukan presensi X
               * todo: ubah atribut
               *  - kunci hadir sesi hanya berlaku hari ini, 24jam, atau 1jam
               *  - reply ketika presensi
               */
              await knex('c_sesi').where({ jid, sesi }).update({ updated_at: knex.fn.now() });
            } else {
              await knex('c_sesi').insert({ jid, sesi, created_at: knex.fn.now(), updated_at: knex.fn.now() });
            }
            // client.sendMessage(jid, 'sesi dibuat!', MessageType.text, { quoted: message });
            client.sendMessage(jid, {
              contentText: `Sesi ${sesi}.`,
              footerText: 'klik tombol atau jawab .hadir <nama_sesi> untuk Presensi!',
              buttons: [
                { buttonId: `.hadir ${sesi}`, buttonText: { displayText: 'Hadir ✋' }, type: 1 }
              ],
              headerType: 1
            }, MessageType.buttonsMessage, { quoted: message });
          } else {
            client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
          }
        })();
        break;
      
      case '.removesesi':
        (async () => {
          let sesi = arg(1);
          if(sesi) {
            let c_sesi = await knex('c_sesi').where({ jid, sesi }).first();
            if(c_sesi) {
              await knex('c_sesi').where({ jid, sesi }).delete();
              await knex('c_sesi_hadir').where({ jid, sesi }).delete();
              client.sendMessage(jid, `sesi ${c_sesi.sesi} berhasil terhapus!`, MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, `sesi ${c_sesi.sesi} tidak ditemukan!`, MessageType.text, { quoted: message });
            }
          } else {
            client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
          }
        })();
        break;

      case '.listsesi':
        let c_sesi = await knex('c_sesi').where({ jid });
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
                let rr = r.replace(/[^a-zA-Z0-9_$]/g, "");
                if(['$no'].includes(rr)) { // except
                  return;
                } else if(rr[0] == '$') {
                  let key = r.substr(1).replace(/[^a-zA-Z0-9_]/g, "");
                  keys.push(key);
                  listqselect.push(knex.raw(`max(case when key = ? then val end) as "${key}"`, [ key ]));
                }
              });
              listqselect.push(knex.raw(`c_sesi_hadir.ownid as "@ownid"`));
              let listcsave = await knex('c_save').select(listqselect)
                .rightOuterJoin('c_sesi_hadir', 'c_sesi_hadir.ownid', 'c_save.ownid')
                .where('c_sesi_hadir.sesi', sesi).groupBy('c_sesi_hadir.ownid');
              let endlist = listcsave.map((r, i) => {
                let nformat = format
                for(let k in r)
                  nformat = nformat.replaceAll(`$${k}`, r[k]);
                nformat = nformat.replaceAll('$no', i+1);
                if(nformat.includes('null')) {
                  nformat += ` @${r['@ownid'].split('@')[0]}`;
                }
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
          let rr = r.replace(/[^a-zA-Z0-9_$]/g, "");
          if(['$no'].includes(rr)) { // except
            return;
          } else if(rr[0] == '$') {
            let key = r.substr(1).replace(/[^a-zA-Z0-9_]/g, "");
            keys.push(key);
            listqselect.push(knex.raw(`max(case when key = ? then val end) as "${key}"`, [ key ]));
          }
        });
        let listcsave = await knex('c_save').select(listqselect).whereIn('key', keys).groupBy('ownid');
        let endlist = listcsave.map((r, i) => {
          let nformat = format
          for(let k in r)
            nformat = nformat.replaceAll(`$${k}`, r[k]);
          nformat = nformat.replaceAll('$no', i+1);
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
            if(participants.filter(r => r.jid.split('@')[0] == arg(1).substr(1))[0].isAdmin) {
              client.sendMessage(jid, 'masih jadi admin, kick ditolak!', MessageType.text, { quoted: message }); // perlu ga ya
            } else {
              client.groupRemove(jid, [`${arg(1).substr(1)}@c.us`]);
              client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
            }
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, 'hanya admin yang bisa melakukan perintah ini!', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.kickme':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, 'anda seorang admin, keluar ditolak!', MessageType.text, { quoted: message });
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
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin && (arg(1)[0] == '@' || arg(1)[0] == '+')) { // bisa ambil dari array participants
            client.groupMakeAdmin(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, 'hanya owner group yang bisa melakukan perintah ini!', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.demote':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin && (arg(1)[0] == '@' || arg(1)[0] == '+')) { // bisa ambil dari array participants
            client.groupDemoteAdmin(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, 'hanya owner group yang bisa melakukan perintah ini!', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, 'harus berada dalam group!', MessageType.text, { quoted: message });
        break;

      case '.stiker':
      case '.sticker':
        let bufferdata;
        if(quotedMessage && Object.keys(quotedMessage).length > 0) {
          const messageType = Object.keys (quotedMessage)[0];
          if (messageType !== MessageType.text && messageType !== MessageType.extendedText) {
            bufferdata = await client.downloadMediaMessage({ message: quotedMessage });
          } else {
            try {
              new URL(s);
              bufferdata = quotedMessage.conversation;
            } catch (err) {}
          }
        } else if (Object.keys(message) !== MessageType.text && Object.keys(message) !== MessageType.extendedText) {
          bufferdata = await client.downloadMediaMessage(message);
        }
        if(bufferdata) {
          // const savedFilename = await client.downloadAndSaveMediaMessage({ message: quotedMessage });
          // const b = await client.downloadMediaMessage({ message: quotedMessage });
          // fs.writeFile("test.mp4", b,  "binary",function(err) { });
          const stickerMetadata = {
            type: 'full',
            pack: arg(1) || 'random',
            author: arg(2) || 'manusia',
            categories: [(arg(3) || '🗿')]
          }
          const sticker = await new Sticker(bufferdata, stickerMetadata).build()
          await client.sendMessage(jid, sticker, MessageType.sticker, { quoted: message });
        } else {
          client.sendMessage(jid, 'Kirim atau reply pesan [foto,video,gif,url] untuk dapat membuat stiker!', MessageType.text, { quoted: message });
        }
        break;

      case '.sleep':
        client.sendMessage(jid, 'Zzz... zzz... zzz....', MessageType.text, { quoted: message });
        break;

      case '.ping':
        client.sendMessage(jid, 'pong', MessageType.text, { quoted: message });
        break;

      case '.spam': // todo: tunggu respon dari sendMessage baru kirm lagi
        (async () => {
          let to = arg(1);
          let max = arg(2);
          console.log(message);
          let val = incometxt.substr(arg(0).length+arg(1).length+arg(2).length+2);
          if(to[0] == '@' && !isNaN(parseInt(max)) && parseInt(max) <= 50) {
            client.sendMessage(jid, 'okay', MessageType.text, { quoted: message });
            for(let i = 0;i < parseInt(max);i++) {
              console.log(['spamming', `${to.substr(1)}@c.us`, 'from', jid]);
              await client.sendMessage(`${to.substr(1)}@c.us`, val, MessageType.text);
            }
          } else {
            client.sendMessage(jid, 'permintaan ditolak!', MessageType.text, { quoted: message });
          }
        })()
        break;
      
      case '.help':
        let perintah = [
          'Perintah tersedia: ',
          '- user atribut (.save, .saved, .remove, .removeall, .show)',
          '- tag sesi (.addsesi, .loopsesi, .removesesi, .hadir)',
          '- listing (.loop, .loopformat)',
          '- stikers (.stiker, .sticker)'
        ];
        client.sendMessage(jid, perintah.join('\n'), MessageType.text, { quoted: message });
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

      case '.verify': // force
      default:
        if(incometxt.includes('sialan')) // todo: filters
          client.sendMessage(jid, 'mulai toxic, mau kick?', MessageType.text, { quoted: message });

        if(Object.keys(quotedMessage).length && incometxt == 'tau siapa?') { // todo: auto when reply
          client.sendMessage(jid, 'ntahlah', MessageType.text, { quoted: message });
        }

        if(arg(0)[0] == '.' && arg(0) !== '.') {
          client.sendMessage(jid, 'maap gapaham, perintah tidak diketahui.', MessageType.text, { quoted: message });
        }

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

module.exports = chatHandler;