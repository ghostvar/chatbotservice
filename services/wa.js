require('dotenv').config();
const wa = require('@open-wa/wa-automate');
const chatHandler = require('./handlers/chatHandler');

wa.create({
  sessionId: 'session',
  qrTimeout: 0,
  authTimeout: 0,
  restartOnCrash: start,
  cacheEnabled: false,
  useChrome: true,
  killProcessOnBrowserClose: true,
  throwErrorOnTosBlock: false,
  chromiumArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--aggressive-cache-discard',
    '--disable-cache',
    '--disable-application-cache',
    '--disable-offline-load-stale-cache',
    '--disk-cache-size=0'
  ]
}).then(client => start(client));

function start(client) {
  console.log('[SERVER] WhatsApp Runtime Started!');

  client.onMessage(async message => {
    await chatHandler(client, message);
  });
}
