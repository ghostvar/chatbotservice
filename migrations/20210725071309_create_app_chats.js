
exports.up = function(knex) {
  return knex.schema.createTable('app_chats', function (table) {
    table.uuid('chatid');
    table.integer('appid');
    table.string('jid');
    table.string('name').nullable();
    table.text('desc').nullable();
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('app_chats');
};
