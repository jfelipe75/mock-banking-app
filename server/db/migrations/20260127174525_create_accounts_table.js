/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
   return knex.schema.createTable('accounts', (table) => {
    table
      .uuid('account_id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table
      .uuid('user_id')
      .notNullable()
      .references('user_id')
      .inTable('users')
      .onDelete('CASCADE');

    table
      .string('status')
      .notNullable()
      .defaultTo('ACTIVE');

    table
      .bigInteger('current_balance')
      .notNullable()
      .defaultTo(0);

    table
      .timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp('frozen_at', { useTz: true })
      .nullable();

    table
      .timestamp('terminated_at', { useTz: true })
      .nullable();

    // DB-enforced invariants
    table.check("status IN ('ACTIVE', 'FROZEN', 'TERMINATED')");
    table.check('current_balance >= 0');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTable('accounts')
