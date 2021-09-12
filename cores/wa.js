require('dotenv').config();
const chatHandler = require('../handlers/chatHandler');
const Emiter = require('../services/eventEmiter');
const { WAConnection, MessageType } = require('@adiwajshing/baileys');
const fs = require('fs');

async function connectToWhatsApp() {
  const conn = new WAConnection();

  // session keys
  if(fs.existsSync('./whatsapp.key.json')) {
    conn.loadAuthInfo('./whatsapp.key.json');
  }

  conn.on('open', () => {
    console.log(`credentials updated!`)
    const authInfo = conn.base64EncodedAuthInfo();
    fs.writeFileSync('./whatsapp.key.json', JSON.stringify(authInfo, null, '\t'));
  });

  await conn.connect();
  conn.on('chat-update', async event => {
    if (event.messages && event.count) {
      const message = event.messages.all()[0];
      await chatHandler(conn, message, event);
    } //else console.log(event) // see updates (can be archived, pinned etc.)
  });

  conn.on('group-participants-update', async (event) => {
    // welcome & goodbye
  });

  Emiter.on('sendMessage', ({ jid, text }) => {
    // event pesan dari api
    conn.sendMessage(jid, text, MessageType.text);
  });
}
// run in main file
connectToWhatsApp()
  .catch(err => console.log("unexpected error: " + err)) // catch any errors
