
exports.up = function(knex) {
  return knex.schema.createTable('apps', function (table) {
    table.increments();
    table.string('app_name');
    table.text('app_desc').nullable();
    table.text('webhook_url');
    table.timestamps();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('apps');
};
