/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('transactions', (table) => {
        table.uuid('transaction_id')
        .primary()
        .defaultTo(knex.raw('gen_random_uuid()'));

        table.string('status')
        .notNullable()
        .defaultTo('PENDING');

        table.string('type')
        .notNullable();

        table.uuid('initiator_user_id')
        .notNullable()
        .references('user_id')
        .inTable('users')


        table.uuid('from_account_id')
        .nullable()
        .references('account_id')
        .inTable('accounts')

        table.uuid('to_account_id')
        .nullable()
        .references('account_id')
        .inTable('accounts')

        table.bigInteger('amount')
        .notNullable()

        // nullable except for transfer
        table.uuid('idempotency_key')
        .nullable()

        table.jsonb('response_payload')
        .nullable()

        table.string('failure_reason')
        .nullable()

        table
        .timestamp('created_at', { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());

        // DB invariants
        table.check("status IN ('PENDING','SUCCEEDED','REJECTED','FAILED')");
        table.check("type IN ('TRANSFER','DEPOSIT','WITHDRAWAL')");
        table.check('amount > 0');

        // Shape constraints (each is its own CHECK)
        table.check(`
        type <> 'TRANSFER'
        OR (from_account_id IS NOT NULL AND to_account_id IS NOT NULL)
        `);

        table.check(`
        type <> 'DEPOSIT'
        OR (from_account_id IS NULL AND to_account_id IS NOT NULL)
        `);

        table.check(`
        type <> 'WITHDRAWAL'
        OR (from_account_id IS NOT NULL AND to_account_id IS NULL)
        `);

    })
    .then(() => knex.raw(`
        CREATE UNIQUE INDEX uq_transfer_idempotency_per_user 
        ON transactions (initiator_user_id, idempotency_key, type)
        WHERE type = 'TRANSFER' AND idempotency_key IS NOT NULL`));
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTable('transactions');
