
exports.up = function(knex) {
  return knex.schema.createTable('c_notes', function (table) {
    table.string('jid');
    table.string('name');
    table.text('note');
    table.unique(['jid', 'name']);
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('c_notes');
};
