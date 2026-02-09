const knex = require('../db/knex');

module.exports = async () => {
  await knex.migrate.rollback(undefined, true);
  await knex.migrate.latest();
};
