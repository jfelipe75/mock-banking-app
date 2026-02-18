/**
 * Transfer Service — TO_ACCOUNT_FROZEN Rejection
 *
 * This test verifies that:
 * - a transfer is REJECTED when the toAccount is FROZEN
 * - balances remain unchanged
 * - no ledger entries are written
 * - the transaction status is REJECTED
 * - audit logs record ATTEMPTED and REJECTED outcomes
 *
 * Business rule:
 * - Transfers must not proceed if toAccount.status !== 'ACTIVE'
 *
 * This test talks directly to the service layer (no HTTP).
 */

const crypto = require('crypto');
const knex = require('../../db/knex');
const { transferFunds } = require('../../services/transferService');

describe('Transfer Service — TO_ACCOUNT_FROZEN Rejection', () => {
  let testUserId;
  let fromAccountId;
  let toAccountId;
  let idempotencyKey;

  const initialFromBalance = 5000;
  const initialToBalance = 2000;
  const transferAmount = 1000;

  test('Transfer is REJECTED when toAccount is FROZEN', async () => {
    // ==================== ARRANGE ====================

    // Create one user
    const [user] = await knex('users')
      .insert({
        username: 'testuser_frozen_to',
        password_hash: 'TEST_ONLY_HASH',
      })
      .returning('*');
    testUserId = user.user_id;

    // Create an ACTIVE fromAccount with sufficient balance
    const [fromAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialFromBalance,
      })
      .returning('*');
    fromAccountId = fromAccount.account_id;

    // Create a FROZEN toAccount
    const [toAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'FROZEN',
        current_balance: initialToBalance,
      })
      .returning('*');
    toAccountId = toAccount.account_id;

    // Generate an idempotency key
    idempotencyKey = crypto.randomUUID();

    // ==================== ACT ====================

    // Call transferFunds with valid inputs
    const result = await transferFunds({
      initiatorUserId: testUserId,
      fromAccountId,
      toAccountId,
      amount: transferAmount,
      idempotencyKey,
    });

    // ==================== ASSERT ====================

    // 1) Service result assertions
    expect(result.success).toBe(false);
    expect(result.status).toBe('REJECTED');
    expect(result.reason).toBe('TO_ACCOUNT_NOT_ACTIVE');

    const { transactionId } = result;

    // 2) Transaction row exists with status REJECTED and failure_reason
    const transactions = await knex('transactions')
      .where({ transaction_id: transactionId });

    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe('REJECTED');
    expect(transactions[0].type).toBe('TRANSFER');
    expect(transactions[0].failure_reason).toBe('TO_ACCOUNT_NOT_ACTIVE');

    // 3) Account balances remain unchanged
    const updatedFromAccount = await knex('accounts')
      .where({ account_id: fromAccountId })
      .first();
    const updatedToAccount = await knex('accounts')
      .where({ account_id: toAccountId })
      .first();

    expect(Number(updatedFromAccount.current_balance)).toBe(initialFromBalance);
    expect(Number(updatedToAccount.current_balance)).toBe(initialToBalance);

    // 4) Ledger entries has zero rows for this transaction
    const ledgerEntries = await knex('ledger_entries')
      .where({ transaction_id: transactionId });

    expect(ledgerEntries).toHaveLength(0);

    // 5) Audit logs contains exactly two rows with outcomes ATTEMPTED and REJECTED
    const auditLogs = await knex('audit_logs')
      .where({ target_id: transactionId, target_type: 'TRANSACTION', action: 'TRANSFER' })
      .orderBy('created_at', 'asc');

    expect(auditLogs).toHaveLength(2);

    // First audit log: ATTEMPTED
    const attemptedLog = auditLogs.find((log) => log.outcome === 'ATTEMPTED');
    expect(attemptedLog).toBeDefined();
    expect(attemptedLog.actor_type).toBe('USER');
    expect(attemptedLog.actor_id).toBe(testUserId);
    expect(attemptedLog.action).toBe('TRANSFER');
    expect(attemptedLog.target_type).toBe('TRANSACTION');

    // Second audit log: REJECTED with reason
    const rejectedLog = auditLogs.find((log) => log.outcome === 'REJECTED');
    expect(rejectedLog).toBeDefined();
    expect(rejectedLog.actor_type).toBe('USER');
    expect(rejectedLog.actor_id).toBe(testUserId);
    expect(rejectedLog.action).toBe('TRANSFER');
    expect(rejectedLog.target_type).toBe('TRANSACTION');
    expect(rejectedLog.reason).toBe('TO_ACCOUNT_NOT_ACTIVE');
  });
});
