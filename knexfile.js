require('dotenv').config();

module.exports = {
  client: process.env.DB_CONNECTION,
  connection: {
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_POST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
  }
};
