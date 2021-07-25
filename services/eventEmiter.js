const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}

const Emiter = new MyEmitter();

module.exports = Emiter;