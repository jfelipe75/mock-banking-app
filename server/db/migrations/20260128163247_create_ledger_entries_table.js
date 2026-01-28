/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('ledger_entries', (table) => {
        table.uuid('ledger_entry_id')
        .primary()
        .defaultTo(knex.raw('gen_random_uuid()'));

        table.bigInteger('amount')
        .notNullable();

        table.uuid('account_id')
        .notNullable()
        .references('account_id')
        .inTable('accounts');

        table.uuid('transaction_id')
        .notNullable()
        .references('transaction_id')
        .inTable('transactions');

        table.timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

        // DB invariants
        table.check('amount <> 0');

        // access pattern
        table.index(['account_id', 'created_at'], 'idx_ledger_account_created_at');
    })
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTable('ledger_entries')
