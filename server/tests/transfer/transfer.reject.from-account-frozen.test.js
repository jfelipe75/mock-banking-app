/**
 * Transfer Service — FROM_ACCOUNT_FROZEN Rejection
 *
 * This test verifies that:
 * - a transfer is REJECTED when the fromAccount is FROZEN
 * - balances remain unchanged
 * - no ledger entries are written
 * - the transaction status is REJECTED
 * - audit logs record ATTEMPTED and REJECTED outcomes
 *
 * Business rule:
 * - Transfers must not proceed if fromAccount.status !== 'ACTIVE'
 *
 * This test talks directly to the service layer (no HTTP).
 */

const knex = require('../../db/knex');
const { transferFunds } = require('../../services/transferService');
const crypto = require('crypto');

describe('Transfer Service — FROM_ACCOUNT_FROZEN Rejection', () => {
  let testUserId;
  let fromAccountId;
  let toAccountId;
  let idempotencyKey;

  const initialFromBalance = 5000; // sufficient funds
  const initialToBalance = 2000;
  const transferAmount = 1000;

  test('Transfer is REJECTED when fromAccount is FROZEN', async () => {
    // ==================== ARRANGE ====================
    // - create user
    // - create FROZEN fromAccount with sufficient balance
    // - create ACTIVE toAccount
    // - generate idempotency key

    const [user] = await knex('users')
      .insert({
        username: 'testuser_frozen_from',
        password_hash: 'TEST_ONLY_HASH'
      })
      .returning('*');
    testUserId = user.user_id;

    // fromAccount is FROZEN with sufficient balance
    const [fromAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'FROZEN',
        current_balance: initialFromBalance
      })
      .returning('*');
    fromAccountId = fromAccount.account_id;

    // toAccount is ACTIVE
    const [toAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialToBalance
      })
      .returning('*');
    toAccountId = toAccount.account_id;

    // Generate idempotency key
    idempotencyKey = crypto.randomUUID();

    // ==================== ACT ====================
    // - call transferFunds()

    const result = await transferFunds({
      initiatorUserId: testUserId,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: transferAmount,
      idempotencyKey: idempotencyKey
    });

    // ==================== ASSERT ====================
    // 1) service result indicates REJECTED
    // 2) transactions table reflects rejection + failure reason
    // 3) account balances remain unchanged
    // 4) ledger_entries has zero rows
    // 5) audit_logs contain ATTEMPTED and REJECTED entries

    // 1) Service result assertions
    expect(result.success).toBe(false);
    expect(result.status).toBe('REJECTED');
    expect(result.reason).toBe('FROM_ACCOUNT_NOT_ACTIVE');

    const transactionId = result.transactionId;

    // 2) Transactions table: exactly 1 row with status = REJECTED
    const transactions = await knex('transactions')
      .where({ transaction_id: transactionId });

    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe('REJECTED');
    expect(transactions[0].type).toBe('TRANSFER');
    expect(transactions[0].failure_reason).toBe('FROM_ACCOUNT_NOT_ACTIVE');

    // 3) Account balances remain unchanged
    const updatedFromAccount = await knex('accounts')
      .where({ account_id: fromAccountId })
      .first();
    const updatedToAccount = await knex('accounts')
      .where({ account_id: toAccountId })
      .first();

    expect(Number(updatedFromAccount.current_balance)).toBe(initialFromBalance);
    expect(Number(updatedToAccount.current_balance)).toBe(initialToBalance);

    // 4) Ledger entries: 0 rows (no money moved)
    const ledgerEntries = await knex('ledger_entries')
      .where({ transaction_id: transactionId });

    expect(ledgerEntries).toHaveLength(0);

    // 5) Audit logs: exactly 2 rows (ATTEMPTED and REJECTED)
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

    // Second audit log: REJECTED with reason
    const rejectedLog = auditLogs.find(log => log.outcome === 'REJECTED');
    expect(rejectedLog).toBeDefined();
    expect(rejectedLog.actor_type).toBe('USER');
    expect(rejectedLog.actor_id).toBe(testUserId);
    expect(rejectedLog.action).toBe('TRANSFER');
    expect(rejectedLog.target_type).toBe('TRANSACTION');
    expect(rejectedLog.reason).toBe('FROM_ACCOUNT_NOT_ACTIVE');
  });
});
