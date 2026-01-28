/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = (knex) => {
  return knex.schema.createTable('users', (table) => {
    table.uuid('user_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('username', 255).notNullable().unique();
    table.string('password_hash').notNullable();
    table.timestamp('created_at', {useTz: true}).notNullable().defaultTo(knex.fn.now());
  })
};


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = (knex) => knex.schema.dropTable('users');
