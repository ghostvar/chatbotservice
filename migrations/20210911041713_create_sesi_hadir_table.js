
exports.up = function(knex) {
  return knex.schema.createTable('c_sesi_hadir', function (table) {
    table.increments();
    table.string('jid');
    table.string('sesi');
    table.string('ownid'); // nomor pengguna
    table.unique(['id', 'jid', 'sesi']);
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('c_sesi_hadir');
};
