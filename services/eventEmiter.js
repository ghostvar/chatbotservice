const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}

const Emiter = new MyEmitter();
const ButtonEmiter = new MyEmitter();

module.exports = { Emiter, ButtonEmiter };