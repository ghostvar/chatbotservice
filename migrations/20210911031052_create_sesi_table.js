
exports.up = function(knex) {
  return knex.schema.createTable('c_sesi', function (table) {
    table.string('jid');
    table.string('sesi');
    table.jsonb('attr').default('{}');
    table.primary(['jid', 'sesi']);
    table.unique(['jid', 'sesi']);
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('c_sesi');
};
