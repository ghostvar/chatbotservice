// import { Boom } from '@hapi/boom'
// const P = require('pino')
// const Baileys = require('./services/Baileys');
const Baileys = require('@adiwajshing/baileys');;
const makeWASocket = Baileys.default;
const { AnyMessageContent, delay, DisconnectReason, downloadContentFromMessage, makeInMemoryStore, useSingleFileAuthState } = Baileys;
const { createSticker, Sticker } = require('wa-sticker-formatter');

const store = makeInMemoryStore({
	// logger: P().child({ level: 'debug', stream: 'store' })
})
// store.readFromFile('./baileys_store_multi.json')
// // save every 10s
// setInterval(() => {
// 	store.writeToFile('./baileys_store_multi.json')
// }, 10000)

const { state, saveState } = useSingleFileAuthState('./whatsapp.key.json')

// start a connection
const startSock = () => {
  const sock = makeWASocket({
		// logger: P({ level: 'trace' }),
		printQRInTerminal: true,
		auth: state,
		// implement to handle retries
		getMessage: async key => {
			return {
				conversation: 'hello'
			}
		}
	})

  store.bind(sock.ev)

	// const sendMessageWTyping = async(msg, jid) => {
	// 	await sock.presenceSubscribe(jid)
	// 	await delay(500)

	// 	await sock.sendPresenceUpdate('composing', jid)
	// 	await delay(2000)

	// 	await sock.sendPresenceUpdate('paused', jid)

	// 	await sock.sendMessage(jid, msg)
	// }
    
	// sock.ev.on('chats.set', item => console.log(`recv ${item.chats.length} chats (is latest: ${item.isLatest})`))
	// sock.ev.on('messages.set', item => console.log(`recv ${item.messages.length} messages (is latest: ${item.isLatest})`))
	// sock.ev.on('contacts.set', item => console.log(`recv ${item.contacts.length} contacts`))

	sock.ev.on('messages.upsert', async m => {
		// console.log(JSON.stringify(m, undefined, 2))
        
		const message = m.messages[0]
		const client = sock;
		const jid = message.key.remoteJid;
		if(!message.key.fromMe && m.type === 'notify') {
			const messageObj = message.message || {};
			const quotedMessage = ((messageObj.extendedTextMessage || {}).contextInfo || {}).quotedMessage || {} ;
			if(message && message.message) {
				let rawincometxt = messageObj.conversation || (messageObj.imageMessage || messageObj.videoMessage || {}).caption || (messageObj.extendedTextMessage || {}).text || (messageObj.buttonsResponseMessage || {}).selectedButtonId || '';
				const incometxt = rawincometxt[0] == '#' && rawincometxt !== '#' ? rawincometxt = '.getnote ' + rawincometxt.substr(1) : rawincometxt; // aliases # as .getnote
				const arg = (n) => incometxt.trim().split(' ')[n] || '';
				// console.log(incometxt);

				if(arg(0) == '.ping')
					client.sendMessage(jid, { text: '_Pyon!!_' }, { quoted: message });
					
				if(['.sticker', '.stiker'].includes(arg(0))) {
					let bufferdata;
					if(quotedMessage && Object.keys(quotedMessage).length > 0) {
						let messageType = Object.keys (quotedMessage)[0];
						if (messageType !== 'conversation' && messageType !== 'extendedTextMessage') {
							let stream;
							if(messageType == 'imageMessage')
								stream = await downloadContentFromMessage(quotedMessage.imageMessage, 'image');
							if(messageType == 'videoMessage')
								stream = await downloadContentFromMessage(quotedMessage.videoMessage, 'video');
							if(stream) {
								let buffer = Buffer.from([])
								for await(const chunk of stream) {
									buffer = Buffer.concat([buffer, chunk])
								}
								bufferdata = buffer;
							}
						} else {
							try {
								new URL(quotedMessage.conversation);
								bufferdata = quotedMessage.conversation;
							} catch (err) {}
						}
					} else {
						let messageType = Object.keys(messageObj)[0];
						if (messageType === 'videoMessage' || messageType === 'imageMessage') {
							let stream;
							if(messageType == 'imageMessage')
								stream = await downloadContentFromMessage(messageObj.imageMessage, 'image');
							if(messageType == 'videoMessage')
								stream = await downloadContentFromMessage(messageObj.videoMessage, 'video');
							if(stream) {
								let buffer = Buffer.from([])
								for await(const chunk of stream) {
									buffer = Buffer.concat([buffer, chunk])
								}
								bufferdata = buffer;
							}
						} else if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
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
						await client.sendMessage(jid, { sticker }, { quoted: message });
					} else {
						client.sendMessage(jid, { text: '_Kirim atau reply pesan [foto,video,gif,url] untuk dapat membuat stiker!_' }, { quoted: message });
					}
				}

				if(['.save','.show','.saved','.removeall','.remove','.addsesi','.setsesi','.removesesi','.listsesi','.presensi','.hadiran','.hadir','.loopsesi','.loop','.loopformat','.notes','.setnote','.getnote','.removenote','.setprofile','.setname','.setnama','.setdesc','.invite','.kick','.kickme','.members','.invitelink','.promote','.demote','.ocr','.ketik','.tr','.translite','.sleep','.help','.tes','.tts','.verify'].includes(arg(0))) {
					client.sendMessage(jid, { text: '_Maaf fitur sedang tidak dapat digunakan karena dalam penulisan ulang kode!_' }, { quoted: message });
				}
			}
			// console.log('replying to', m.messages[0].key.remoteJid)
			// await sock.sendReadReceipt(msg.key.remoteJid, msg.key.participant, [msg.key.id])
			// await sendMessageWTyping({ text: 'Hello there!' }, msg.key.remoteJid)
		}
        
	})

	// sock.ev.on('messages.update', m => console.log(m))
	// sock.ev.on('message-receipt.update', m => console.log(m))
	// sock.ev.on('presence.update', m => console.log(m))
	// sock.ev.on('chats.update', m => console.log(m))
	// sock.ev.on('contacts.upsert', m => console.log(m))

	sock.ev.on('connection.update', (update) => {
		const { connection, lastDisconnect } = update
		if(connection === 'close') {
			// reconnect if not logged out
			if(lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
				startSock()
			} else {
				console.log('connection closed')
			}
		}
        
		// console.log('connection update', update)
	})
	// listen for when the auth credentials is updated
	sock.ev.on('creds.update', saveState)

	return sock
}

// run in main file
startSock()