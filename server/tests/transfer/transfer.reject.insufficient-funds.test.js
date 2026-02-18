/**
 * Transfer Service — INSUFFICIENT_FUNDS Rejection
 *
 * This test verifies that:
 * - a transfer is REJECTED when fromAccount has insufficient balance
 * - no money moves
 * - no ledger entries are written
 * - the transaction status is REJECTED
 * - audit logs record ATTEMPTED and REJECTED outcomes
 *
 * This test talks directly to the service layer (no HTTP).
 */

const crypto = require('crypto');
const knex = require('../../db/knex');
const { transferFunds } = require('../../services/transferService');

describe('Transfer Service — INSUFFICIENT_FUNDS Rejection', () => {
  let testUserId;
  let fromAccountId;
  let toAccountId;
  let idempotencyKey;
  const initialFromBalance = 500;
  const initialToBalance = 2000;
  const transferAmount = 1000; // Greater than fromAccount balance

  test('Transfer is REJECTED when amount exceeds fromAccount balance', async () => {
    // ==================== ARRANGE ====================

    // Insert one user
    const [user] = await knex('users')
      .insert({
        username: 'testuser_insufficient',
        password_hash: 'TEST_ONLY_HASH',
      })
      .returning('*');
    testUserId = user.user_id;

    // Insert two ACTIVE accounts
    // fromAccount.current_balance < transfer amount
    const [fromAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialFromBalance,
      })
      .returning('*');
    fromAccountId = fromAccount.account_id;

    // toAccount.current_balance arbitrary
    const [toAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialToBalance,
      })
      .returning('*');
    toAccountId = toAccount.account_id;

    // Generate an idempotency key using crypto.randomUUID()
    idempotencyKey = crypto.randomUUID();

    // ==================== ACT ====================

    // Call transferFunds() with amount greater than available balance
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
    expect(result.reason).toBe('INSUFFICIENT_FUNDS');

    const { transactionId } = result;

    // 2) Transactions table: exactly 1 row with status = REJECTED, type = TRANSFER
    const transactions = await knex('transactions')
      .where({ transaction_id: transactionId });

    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe('REJECTED');
    expect(transactions[0].type).toBe('TRANSFER');
    expect(transactions[0].failure_reason).toBe('INSUFFICIENT_FUNDS');

    // 3) Accounts table: balances are unchanged
    const updatedFromAccount = await knex('accounts')
      .where({ account_id: fromAccountId })
      .first();
    const updatedToAccount = await knex('accounts')
      .where({ account_id: toAccountId })
      .first();

    expect(Number(updatedFromAccount.current_balance)).toBe(initialFromBalance);
    expect(Number(updatedToAccount.current_balance)).toBe(initialToBalance);

    // 4) Ledger entries table: 0 rows
    const ledgerEntries = await knex('ledger_entries')
      .where({ transaction_id: transactionId });

    expect(ledgerEntries).toHaveLength(0);

    // 5) Audit logs table: exactly 2 rows with outcomes ATTEMPTED and REJECTED
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

    // Second audit log: REJECTED with reason = 'INSUFFICIENT_FUNDS'
    const rejectedLog = auditLogs.find((log) => log.outcome === 'REJECTED');
    expect(rejectedLog).toBeDefined();
    expect(rejectedLog.actor_type).toBe('USER');
    expect(rejectedLog.actor_id).toBe(testUserId);
    expect(rejectedLog.action).toBe('TRANSFER');
    expect(rejectedLog.target_type).toBe('TRANSACTION');
    expect(rejectedLog.reason).toBe('INSUFFICIENT_FUNDS');
  });
});
