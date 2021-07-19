
exports.up = function(knex) {
  return knex.schema.createTable('verification', function (table) {
    table.increments();
    table.integer('appid');
    table.string('token');
    table.text('custom_txt_res').nullable();
    table.text('redirect').nullable();
    table.timestamps();
    table.unique('token');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('verification');
};
