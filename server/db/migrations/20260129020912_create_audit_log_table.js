/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('audit_log_id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));

    table.string('actor_type')
      .notNullable();

    table.string('actor_id')
      .notNullable();

    table.string('action')
      .notNullable();

    table.string('target_type')
      .notNullable();

    table.string('target_id')
      .nullable();

    table.string('outcome')
      .notNullable();

    table.string('reason')
      .nullable();

    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    // DB invariants
    table.check("actor_type IN ('USER','SERVICE','SYSTEM')");

    table.check("target_type IN ('ACCOUNT','TRANSACTION','SESSION','USER')");

    table.check("outcome IN ('ATTEMPTED','SUCCEEDED','REJECTED','FAILED')");

    // Access patterns

    /**
         * 1) idx_audit_created_at
            - Enables fast chronological scans of audit logs (latest events first).
            - Used for monitoring, debugging, and incident investigation.
            - Prevents full table scans when querying recent activity.
         */
    table.index(['created_at'], 'idx_audit_created_at');

    /**
         * 2) idx_audit_actor
            - Composite index on (actor_type, actor_id, created_at).
            - Allows efficient lookup of all actions performed by a specific actor
            (e.g., a user, service, or system component), ordered by time.
            - Matches queries like:
            WHERE actor_type = 'USER'
            AND actor_id = ?
            ORDER BY created_at DESC
         */
    table.index(['actor_type', 'actor_id', 'created_at'], 'idx_audit_actor');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTable('audit_logs');
