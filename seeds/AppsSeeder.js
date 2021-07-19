exports.seed = function(knex) {
  return knex('apps').del()
    .then(function () {
      return knex('apps').insert([
        {id: 1, app_name: 'Example', webhook_url: 'http://127.0.0.1:8080/verification.php'},
        // {id: 2, app_name: 'Bansos', webhook_url: 'http://127.0.0.1/bansos/'},
      ]);
    });
};
