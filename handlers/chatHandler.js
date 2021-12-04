require('dotenv').config();
const knex = require('../services/knex');
const axios = require('axios');
const { MessageType } = require('@adiwajshing/baileys');
const { createSticker, Sticker } = require('wa-sticker-formatter');
const uuid = require('uuid');
const ocr = require('node-tesseract-ocr');
const URL = require("url").URL;
// const fs = require('fs');

const chatHandler = async (client, message, event) => {
  const { jid } = event;
  try {
    const isGroup = (jid.split('@')[1] || '') === 'g.us';
    const ownid = isGroup ? message.key.participant : jid;
    const messageObj = message.message || {};
    const quotedMessage = ((messageObj.extendedTextMessage || {}).contextInfo || {}).quotedMessage || {} ;
    let rawincometxt = messageObj.conversation || (messageObj.imageMessage || messageObj.videoMessage || {}).caption || (messageObj.extendedTextMessage || {}).text || (messageObj.buttonsResponseMessage || {}).selectedButtonId || '';
    const incometxt = rawincometxt[0] == '#' && rawincometxt !== '#' ? rawincometxt = '.getnote ' + rawincometxt.substr(1) : rawincometxt; // aliases # as .getnote
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
          client.sendMessage(jid, '_tersimpan!_', MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
        }
        break;

      case '.show':
        (async () => {
          let key = arg(1);
          let c_save = await knex('c_save').where({ ownid, key }).first();
          if(c_save)
            client.sendMessage(jid, c_save.val, MessageType.text, { quoted: message });
          else
            client.sendMessage(jid, `_tidak terdapat '${key}' tersimpan_`, MessageType.text, { quoted: message });
        })();
        break;

      case '.saved':
        let c_save = await knex('c_save').where({ ownid });
        client.sendMessage(jid, c_save.map(r => `- ${r.key}`).join('\n'), MessageType.text, { quoted: message });
        break;

      case '.removeall':
        await knex('c_save').where({ ownid }).delete();
        client.sendMessage(jid, '_berhasil hapus semua!_', MessageType.text, { quoted: message });
        break;

      case '.remove':
        await knex('c_save').where({ ownid, key: arg(1) }).delete();
        client.sendMessage(jid, '_atribut berhasil dihapus!_', MessageType.text, { quoted: message });
        break;

      case '.addsesi':
      case '.setsesi':
        (async () => {
          let sesi = arg(1);
          if(sesi) {
            let c_sesi = await knex('c_sesi').where({ jid, sesi }).first();
            if(c_sesi) {
              /**
               * todo: uuid instean of sesi, sesi sebagai keterangan saja
               * todo: buat tombol untuk melakukan presensi (X pada perangkat android tombol hanya bisa di klik sekali)
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
            client.sendMessage(jid, '!', MessageType.text, { quoted: message });
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
              client.sendMessage(jid, `_sesi ${c_sesi.sesi} berhasil terhapus!_`, MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, `_sesi ${c_sesi.sesi} tidak ditemukan!_`, MessageType.text, { quoted: message });
            }
          } else {
            client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
          }
        })();
        break;

      case '.listsesi':
        let c_sesi = await knex('c_sesi').where({ jid });
        if(c_sesi.length > 0) {
          client.sendMessage(jid, c_sesi.map(r => `- ${r.sesi}`).join('\n'), MessageType.text, { quoted: message });
        } else {
          client.sendMessage(jid, '_tidak ada sesi tersimpan!_', MessageType.text, { quoted: message });
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
              client.sendMessage(jid, '_tersimpan!_', MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, `_sesi ${sesi} tidak ditemukan!_`, MessageType.text, { quoted: message });
            }
          } else client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
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
              client.sendMessage(jid, `_sesi ${sesi} tidak ditemukan!_`, MessageType.text, { quoted: message });
            }
          } else client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
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
        if(keys.length > 0) {
          let onlys = [ownid];
          if(isGroup) {
            const { participants } = await client.groupMetadata(jid);
            onlys = participants.map(r => r.jid);
          }
          let listcsave = await knex('c_save').select(listqselect).whereIn('key', keys).whereIn('ownid', onlys).groupBy('ownid');
          let endlist = listcsave.map((r, i) => {
            let nformat = format
            for(let k in r)
              nformat = nformat.replaceAll(`$${k}`, r[k]);
            nformat = nformat.replaceAll('$no', i+1);
            return nformat;
          }).join('\n');
          client.sendMessage(jid, endlist, MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_format tidak valid!_', MessageType.text, { quoted: message });
        break;
      
      case '.notes': // todo: menggunaakn listMessage
        async function listNotes() {
          let c_notes = await knex('c_notes').select('name').where('jid', jid);
          let endnote = c_notes.map(r => `- ${r.name}`).join('\n');
          if(c_notes.length > 0) {
            client.sendMessage(jid, endnote, MessageType.text, { quoted: message });
          } else {
            client.sendMessage(jid, '_tidak terdapat catatan tersimpan!_', MessageType.text, { quoted: message });
          }
        }
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            await listNotes();
          } else client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
        } else {
          await listNotes();
        }
        break;

      case '.setnote': // todo: buat catatan dari reply pesan & support pesan gambar, video, dll.
        async function setNote() {
          let notename = arg(1);
          let note = incometxt.substr(arg(0).length+arg(1).length+2);
          if(notename && note) {
            let c_note = await knex('c_notes').where('jid', jid).where('name', notename);
            if(c_note.length > 0) {
              await knex('c_notes').update({ note, updated_at: knex.fn.now() }).where('jid', jid).where('name', notename);
            } else {
              await knex('c_notes').insert({ jid, name: notename, note, created_at: knex.fn.now(), updated_at: knex.fn.now() });
            }
            client.sendMessage(jid, '_tersimpan!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
        }
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            await setNote();
          } else client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
        } else {
          await setNote();
        }
        break;

      case '.getnote':
        let notename = arg(1);
        if(notename) {
          let c_note = await knex('c_notes').where('jid', jid).where('name', notename).first();
          if(c_note) {
            client.sendMessage(jid, c_note.note, MessageType.text, { quoted: message });
          } else {
            client.sendMessage(jid, `_catatan ${notename} tidak ditemukan!_`, MessageType.text, { quoted: message });
          }
        } else client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
        break;
      
      case '.removenote':
        async function delNote() {
          let notename = arg(1);
          if(notename) {
            let c_note = await knex('c_notes').where('jid', jid).where('name', notename).first();
            if(c_note) {
              await knex('c_notes').where('jid', jid).where('name', notename).delete();
              client.sendMessage(jid, `_catatan ${notename} berhasil terhapus!_`, MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, `_tidak terdapat catatan ${notename}!_`, MessageType.text, { quoted: message });
            }
          } else client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
        }
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            await delNote();
          } else client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
        } else {
          await delNote();
        }
        break;

      case '.setprofile':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            const msg = Object.keys(quotedMessage).length > 0 ? quotedMessage : messageObj;
            const messageType = Object.keys (msg)[0];
            if (messageType === MessageType.image || messageType === MessageType.imageMessage) {
              let bufferdata = await client.downloadMediaMessage({ message: msg });
              await client.updateProfilePicture(jid, bufferdata);
              client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
            } else {
              client.sendMessage(jid, '_hanya menerima pesan berbentuk gambar!_', MessageType.text, { quoted: message });
            }
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_permintaan ditolak!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.setname':
      case '.setnama':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            let title = incometxt.substr(arg(0).length+1);
            await client.groupUpdateSubject(jid, title);
            client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_permintaan ditolak!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.setdesc':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            let desc = incometxt.substr(arg(0).length+1);
            await client.groupUpdateDescription(jid, desc);
            client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_permintaan ditolak!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;
        

      case '.invite':
        if(isGroup) {
          if(arg(1)[0] == '@' || arg(1)[0] == '+') {
            client.groupAdd(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_parameter perintah tidak valid!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.kick':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            const quotedTarget = (((messageObj.extendedTextMessage || {}).contextInfo || {}).participant || '').replace('@s.whatsapp.net', '');
            if((arg(1)[0] == '@' || arg(1)[0] == '+') || quotedTarget) {
              const target = arg(1).substr(1) || quotedTarget;
              if(participants.filter(r => r.jid.split('@')[0] == target)[0].isAdmin) {
                client.sendMessage(jid, '_masih jadi admin, kick ditolak!_', MessageType.text, { quoted: message }); // perlu ga ya
              } else {
                client.groupRemove(jid, [`${target}@c.us`]);
                client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
              }
            }
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_hanya admin yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_permintaan ditolak!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.kickme':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if(participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_anda seorang admin, keluar ditolak!_', MessageType.text, { quoted: message });
          } else {
            client.groupRemove(jid, [ownid]);
            client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
          }
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.members':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          let member = participants.map(r => `- ${(r.notify ? r.notify : '@'+r.id.replace('@c.us', ''))}`).join('\n');
          client.sendMessage(jid, member, MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.invitelink':
        const code = await client.groupInviteCode(jid);
        client.sendMessage(jid, `https://chat.whatsapp.com/${code}`, MessageType.text, { quoted: message });
        break;
      
      case '.promote':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if((participants.filter(r => r.jid == ownid)[0].isSuperAdmin || process.env.WA_OWNER == ownid) && (arg(1)[0] == '@' || arg(1)[0] == '+')) {
            client.groupMakeAdmin(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_hanya owner group yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_permintaan ditolak!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
        break;

      case '.demote':
        if(isGroup) {
          const { participants } = await client.groupMetadata(jid);
          if((participants.filter(r => r.jid == ownid)[0].isSuperAdmin || process.env.WA_OWNER == ownid) && (arg(1)[0] == '@' || arg(1)[0] == '+')) {
            client.groupDemoteAdmin(jid, [`${arg(1).substr(1)}@c.us`]);
            client.sendMessage(jid, '_okay_', MessageType.text, { quoted: message });
          } else if(!participants.filter(r => r.jid == ownid)[0].isAdmin) {
            client.sendMessage(jid, '_hanya owner group yang bisa melakukan perintah ini!_', MessageType.text, { quoted: message });
          } else client.sendMessage(jid, '_permintaan ditolak!_', MessageType.text, { quoted: message });
        } else client.sendMessage(jid, '_harus berada dalam group!_', MessageType.text, { quoted: message });
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
              new URL(quotedMessage.conversation);
              bufferdata = quotedMessage.conversation;
            } catch (err) {}
          }
        } else {
          if (Object.keys(messageObj)[0] === MessageType.video || Object.keys(messageObj)[0] === MessageType.image) {
            bufferdata = await client.downloadMediaMessage(message);
          } else if (Object.keys(messageObj)[0] === MessageType.text || Object.keys(messageObj)[0] === MessageType.extendedText) {
            try {
              let s = messageObj.conversation.replace(/.sticker|.stiker/, '').trim();
              new URL(s);
              bufferdata = s;
            } catch (err) {}
          }
        }
        if(bufferdata) {
          const stickerMetadata = {
            type: 'full',
            pack: arg(1) || 'random',
            author: arg(2) || 'manusia',
            categories: [(arg(3) || '🗿')]
          }
          const sticker = await new Sticker(bufferdata, stickerMetadata).build()
          await client.sendMessage(jid, sticker, MessageType.sticker, { quoted: message });
        } else {
          client.sendMessage(jid, '_Kirim atau reply pesan [foto,video,gif,url] untuk dapat membuat stiker!_', MessageType.text, { quoted: message });
        }
        break;

      case '.ocr':
      case '.ketik':
        let bufferdatax;
        if(quotedMessage && Object.keys(quotedMessage).length > 0) {
          const messageType = Object.keys (quotedMessage)[0];
          if (messageType !== MessageType.text && messageType !== MessageType.extendedText) { // perlu cek type juga
            bufferdatax = await client.downloadMediaMessage({ message: quotedMessage });
          } else {
            try {
              new URL(quotedMessage.conversation);
              bufferdatax = quotedMessage.conversation;
            } catch (err) {}
          }
        } else {
          if (Object.keys(messageObj)[0] === MessageType.image) {
            bufferdatax = await client.downloadMediaMessage(message);
          } else if (Object.keys(messageObj)[0] === MessageType.text || Object.keys(messageObj)[0] === MessageType.extendedText) {
            try {
              let s = messageObj.conversation.replace(/.ketik|.ocr/, '').trim();
              new URL(s);
              bufferdatax = s;
            } catch (err) {}
          }
        }
        if(bufferdatax) {
          ocr.recognize(bufferdatax, {
            oem: 1,
            psm: 3,
          })
          .then(async (text) => {
            await client.sendMessage(jid, text, MessageType.text, { quoted: message });
          })
          .catch((error) => {
            console.error(error);
          })
        } else {
          client.sendMessage(jid, '_Kirim atau reply pesan [foto,url] untuk dapat membuat stiker!_', MessageType.text, { quoted: message });
        }
        break;

      case '.sleep':
        client.sendMessage(jid, '_Zzz... zzz... zzz...._', MessageType.text, { quoted: message });
        break;

      case '.ping':
        client.sendMessage(jid, '_Pyon!!_', MessageType.text, { quoted: message });
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
          buttonText: 'Click Me!',
          description: "Hello it's list message",
          sections: [
            {
              title: "Section 1",
              rows: [
                { title: 'Row 1', description: "Hello it's description 1", rowId:"rowid1" },
                { title: 'Row 2', description: "Hello it's description 2", rowId:"rowid2" }
              ]
            }
          ],
          listType: 1
        }, MessageType.listMessage, { quoted: message });
        break;

      case '.verify': // force
      default:
        /**
         * catatan: di posisi default, semua chat melewati baris kode ini,
         * perlu hati-hati ketika terjadi error contoh koneksi database,
         * dalam kasus ini error akan terlempar ke catch utama dibawah dengan mengirimkan pesan balasan terjadi kesalahan ke chat wa, 
         * ekspektasi: catch dengan console error tanpa mengirimkan balasan chat
         * solusi: masukan setiap block kode kemungkinan error dalam try dan catch tanpa reply
         */
        if(incometxt.includes('sialan')) // todo: filters
          client.sendMessage(jid, 'mulai toxic, mau kick?', MessageType.text, { quoted: message });

        if(Object.keys(quotedMessage).length && incometxt == 'tau siapa?') { // todo: auto when reply
          client.sendMessage(jid, 'ntahlah', MessageType.text, { quoted: message });
        }

        if(arg(0)[0] == '.' && arg(0) !== '.') {
          client.sendMessage(jid, '_maap gapaham, perintah tidak dikenal._', MessageType.text, { quoted: message });
        }

        try {
          const verify = await knex('verification').select('verification.*', 'apps.webhook_url')
          .join('apps', 'apps.id', '=', 'verification.appid')
          .where({ token: incometxt }).first();
          if(verify && verify.id) {
            const chatid = uuid.v1();
            await knex('app_chats').insert({ appid: verify.appid, chatid, jid });
            await client.sendMessage(jid, verify.custom_txt_res || ('Nomor Berhasil Terverifikasi!' + (verify.redirect ? '\n\n' + verify.redirect : '')), MessageType.text);
            axios.get(verify.webhook_url, { params: { chatid, token: verify.token, client: 'WA' } });
          }
        } catch (error) {
          console.error(['catch-verification', error]);
        }
        break;
    }
  } catch (error) {
    console.error(['catch-main', error]);
    client.sendMessage(jid, '_terjadi kesalahan!_', MessageType.text, { quoted: message });
  }
}

module.exports = chatHandler;