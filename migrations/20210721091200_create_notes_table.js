
exports.up = function(knex) {
  return knex.schema.createTable('notes', function (table) {
    table.increments();
    table.string('jid');
    table.string('title');
    table.text('notes');
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('notes');
};
