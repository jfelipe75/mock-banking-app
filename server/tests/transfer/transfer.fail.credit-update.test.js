/**
 * Transfer Service — SYSTEM FAILURE (Credit Step Rollback)
 *
 * This test verifies that:
 * - if a system failure occurs AFTER debit succeeds but BEFORE credit runs,
 *   the entire DB transaction is rolled back
 * - account balances remain unchanged
 * - no ledger entries are written
 * - the transaction is marked as FAILED
 * - a SYSTEM audit log entry is recorded
 *
 * Failure injection strategy:
 * - use a test-only failpoint:
 *   { failpoint: 'AFTER_DEBIT_BEFORE_CREDIT' }
 *
 * This test talks directly to the service layer (no HTTP).
 */

const crypto = require('crypto');
const knex = require('../../db/knex');
const { transferFunds } = require('../../services/transferService');

describe('Transfer Service — SYSTEM FAILURE during credit update', () => {
  let testUserId;
  let fromAccountId;
  let toAccountId;
  let idempotencyKey;

  const initialFromBalance = 10000;
  const initialToBalance = 5000;
  const transferAmount = 3000;

  test('Rollback occurs if credit step fails after debit', async () => {
    // ==================== ARRANGE ====================
    // - create user
    // - create ACTIVE fromAccount with sufficient balance
    // - create ACTIVE toAccount
    // - generate idempotency key

    const [user] = await knex('users')
      .insert({
        username: 'testuser_credit_fail',
        password_hash: 'TEST_ONLY_HASH',
      })
      .returning('*');
    testUserId = user.user_id;

    const [fromAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialFromBalance,
      })
      .returning('*');
    fromAccountId = fromAccount.account_id;

    const [toAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialToBalance,
      })
      .returning('*');
    toAccountId = toAccount.account_id;

    idempotencyKey = crypto.randomUUID();

    // ==================== ACT ====================
    // - call transferFunds with failpoint:
    //   { failpoint: 'AFTER_DEBIT_BEFORE_CREDIT' }
    // - expect the service to throw

    await expect(
      transferFunds({
        initiatorUserId: testUserId,
        fromAccountId,
        toAccountId,
        amount: transferAmount,
        idempotencyKey,
        failpoint: 'AFTER_DEBIT_BEFORE_CREDIT',
      }),
    ).rejects.toThrow('TRANSFER_SYSTEM_FAILURE: CREDIT_FAILED_ROLLBACK');

    // ==================== ASSERT ====================
    // 1) balances unchanged
    // 2) no ledger entries exist
    // 3) transaction row exists with status = FAILED
    // 4) audit_logs contains SYSTEM failure entry

    // 1) Account balances are unchanged (rollback worked)
    const updatedFromAccount = await knex('accounts')
      .where({ account_id: fromAccountId })
      .first();
    const updatedToAccount = await knex('accounts')
      .where({ account_id: toAccountId })
      .first();

    expect(Number(updatedFromAccount.current_balance)).toBe(initialFromBalance);
    expect(Number(updatedToAccount.current_balance)).toBe(initialToBalance);

    // 2) A FAILED transaction row must exist
    const transaction = await knex('transactions')
      .where({ idempotency_key: idempotencyKey, type: 'TRANSFER' })
      .first();

    expect(transaction).toBeDefined();
    expect(transaction.status).toBe('FAILED');
    expect(transaction.failure_reason).toBe('CREDIT_FAILED_ROLLBACK');

    // Ledger entries must be empty
    const ledgerEntries = await knex('ledger_entries')
      .where({ transaction_id: transaction.transaction_id });

    expect(ledgerEntries).toHaveLength(0);
    // 3) Transactions table has exactly 1 row with status='FAILED' and failure_reason='CREDIT_FAILED_ROLLBACK'
    const transactions = await knex('transactions')
      .where({ idempotency_key: idempotencyKey, type: 'TRANSFER' });

    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe('FAILED');
    expect(transactions[0].failure_reason).toBe('CREDIT_FAILED_ROLLBACK');

    // 4) Audit logs must contain exactly ONE SYSTEM failure row
    const auditLogs = await knex('audit_logs')
      .where({
        target_id: transaction.transaction_id,
        target_type: 'TRANSACTION',
        action: 'TRANSFER',
      });

    expect(auditLogs).toHaveLength(1);

    const failedLog = auditLogs[0];

    expect(failedLog.actor_type).toBe('SYSTEM');
    expect(failedLog.actor_id).toBe('TRANSFER_SERVICE');
    expect(failedLog.outcome).toBe('FAILED');
    expect(failedLog.reason).toBe('CREDIT_FAILED_ROLLBACK');
    expect(failedLog.target_type).toBe('TRANSACTION');
    expect(failedLog.target_id).toBe(transaction.transaction_id);
  });
});
