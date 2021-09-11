
exports.up = function(knex) {
  return knex.schema.createTable('c_save', function (table) {
    table.string('ownid'); // nomor pengguna
    table.string('key');
    table.text('val');
    table.primary(['ownid', 'key']);
    table.unique(['ownid', 'key']);
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('c_save');
};
