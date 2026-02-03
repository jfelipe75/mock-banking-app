/**
 * Transfer Service — Successful Transfer
 *
 * This test verifies that:
 * - a transfer succeeds between two active accounts
 * - balances are updated correctly
 * - exactly two ledger entries are written
 * - the transaction status is SUCCEEDED
 * - audit logs record ATTEMPTED and SUCCEEDED outcomes
 *
 * This test talks directly to the service layer (no HTTP).
 */

const knex = require('../../db/knex');
const { transferFunds } = require('../../services/transferService');
const crypto = require('crypto');

describe('Transfer Service — Successful Transfer', () => {
  let testUserId;
  let fromAccountId;
  let toAccountId;
  let idempotencyKey;

  beforeAll(async () => {
    // Run migrations to ensure schema is up to date
    await knex.migrate.rollback(undefined, true);
    await knex.migrate.latest();
  });

  afterAll(async () => {
    // Clean up and close connection
    await knex.destroy();
  });

  test('Successful transfer updates balances, ledger, transactions, and audit logs correctly', async () => {
    // ==================== ARRANGE ====================
    
    // Create a test user
    const [user] = await knex('users')
      .insert({
        username: 'testuser',
        password_hash: 'TEST_ONLY_HASH'
      })
      .returning('*');
    testUserId = user.user_id;

    // Create two ACTIVE accounts with known balances
    const [fromAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: 10000
      })
      .returning('*');
    fromAccountId = fromAccount.account_id;

    const [toAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: 5000
      })
      .returning('*');
    toAccountId = toAccount.account_id;

    // Generate a UUID idempotency key
    idempotencyKey = crypto.randomUUID();

    // ==================== ACT ====================
    
    const result = await transferFunds({
      initiatorUserId: testUserId,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: 3000,
      idempotencyKey: idempotencyKey
    });

    // ==================== ASSERT ====================

    // 1) Assert transfer result indicates success
    expect(result.success).toBe(true);
    expect(result.status).toBe('SUCCEEDED');
    expect(result.amount).toBe(3000);
    expect(result.fromAccountId).toBe(fromAccountId);
    expect(result.toAccountId).toBe(toAccountId);
    expect(result.transactionId).toBeDefined();

    const transactionId = result.transactionId;

    // 2) Transactions table assertions
    const transactions = await knex('transactions')
      .where({ transaction_id: transactionId });
    
    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe('SUCCEEDED');
    expect(transactions[0].type).toBe('TRANSFER');
    expect(Number(transactions[0].amount)).toBe(3000);
    expect(transactions[0].initiator_user_id).toBe(testUserId);
    expect(transactions[0].from_account_id).toBe(fromAccountId);
    expect(transactions[0].to_account_id).toBe(toAccountId);
    expect(transactions[0].idempotency_key).toBe(idempotencyKey);

    // 3) Accounts table assertions — balances updated correctly
    const updatedFromAccount = await knex('accounts')
      .where({ account_id: fromAccountId })
      .first();
    const updatedToAccount = await knex('accounts')
      .where({ account_id: toAccountId })
      .first();

    expect(Number(updatedFromAccount.current_balance)).toBe(7000); // 10000 - 3000
    expect(Number(updatedToAccount.current_balance)).toBe(8000);   // 5000 + 3000

    // 4) Ledger entries assertions — exactly TWO rows for this transaction
    const ledgerEntries = await knex('ledger_entries')
      .where({ transaction_id: transactionId })

    expect(ledgerEntries).toHaveLength(2);

    // Debit entry (negative amount)
    const debitEntry = ledgerEntries.find(e => Number(e.amount) < 0);
    expect(debitEntry).toBeDefined();
    expect(Number(debitEntry.amount)).toBe(-3000);
    expect(debitEntry.account_id).toBe(fromAccountId);

    // Credit entry (positive amount)
    const creditEntry = ledgerEntries.find(e => Number(e.amount) > 0);
    expect(creditEntry).toBeDefined();
    expect(Number(creditEntry.amount)).toBe(3000);
    expect(creditEntry.account_id).toBe(toAccountId);

    // 5) Audit logs assertions — ATTEMPTED and SUCCEEDED outcomes
    const auditLogs = await knex('audit_logs')
      .where({ target_id: transactionId, target_type: 'TRANSACTION', action: 'TRANSFER' })
      .orderBy('created_at', 'asc');

    expect(auditLogs).toHaveLength(2);

    // First audit log: ATTEMPTED
    const attemptedLog = auditLogs.find(log => log.outcome === 'ATTEMPTED');
    expect(attemptedLog).toBeDefined();
    expect(attemptedLog.actor_type).toBe('USER');
    expect(attemptedLog.actor_id).toBe(testUserId);
    expect(attemptedLog.action).toBe('TRANSFER');
    expect(attemptedLog.target_type).toBe('TRANSACTION');

    // Second audit log: SUCCEEDED
    const succeededLog = auditLogs.find(log => log.outcome === 'SUCCEEDED');
    expect(succeededLog).toBeDefined();
    expect(succeededLog.actor_type).toBe('USER');
    expect(succeededLog.actor_id).toBe(testUserId);
    expect(succeededLog.action).toBe('TRANSFER');
    expect(succeededLog.target_type).toBe('TRANSACTION');
  });
});
