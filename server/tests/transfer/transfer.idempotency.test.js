/**
 * Transfer Service — Idempotency Replay
 *
 * This test verifies that:
 * - repeating a TRANSFER with the same idempotency key
 *   does NOT create new side effects
 * - balances are not modified twice
 * - no additional ledger entries are written
 * - the same transaction_id and response are returned
 *
 * This test talks directly to the service layer (no HTTP).
 */

const knex = require('../../db/knex');
const { transferFunds } = require('../../services/transferService');
const crypto = require('crypto');

describe('Transfer Service — Idempotency Replay', () => {
  let testUserId;
  let fromAccountId;
  let toAccountId;
  let idempotencyKey;

  const initialFromBalance = 10000;
  const initialToBalance = 5000;
  const transferAmount = 3000;

  test('Replaying a transfer with the same idempotency key returns the same result without side effects', async () => {
    // ==================== ARRANGE ====================

    // Create one user
    const [user] = await knex('users')
      .insert({
        username: 'testuser_idempotency',
        password_hash: 'TEST_ONLY_HASH'
      })
      .returning('*');
    testUserId = user.user_id;

    // Create two ACTIVE accounts with known balances
    const [fromAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialFromBalance
      })
      .returning('*');
    fromAccountId = fromAccount.account_id;

    const [toAccount] = await knex('accounts')
      .insert({
        user_id: testUserId,
        status: 'ACTIVE',
        current_balance: initialToBalance
      })
      .returning('*');
    toAccountId = toAccount.account_id;

    // Generate a UUID idempotency key
    idempotencyKey = crypto.randomUUID();

    // ==================== ACT (first call) ====================

    const firstResult = await transferFunds({
      initiatorUserId: testUserId,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: transferAmount,
      idempotencyKey: idempotencyKey
    });

    // Expect the transfer to SUCCEED
    expect(firstResult.success).toBe(true);
    expect(firstResult.status).toBe('SUCCEEDED');
    expect(firstResult.transactionId).toBeDefined();

    const firstTransactionId = firstResult.transactionId;

    // Capture balances after first call
    const balancesAfterFirstCall = {
      from: await knex('accounts').where({ account_id: fromAccountId }).first(),
      to: await knex('accounts').where({ account_id: toAccountId }).first()
    };

    // ==================== ACT (second call — replay) ====================

    const secondResult = await transferFunds({
      initiatorUserId: testUserId,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: transferAmount,
      idempotencyKey: idempotencyKey
    });

    // ==================== ASSERT ====================

    // 1) Second response: success === true, transactionId is the same as the first call
    expect(secondResult.success).toBe(true);
    expect(secondResult.status).toBe('SUCCEEDED');
    expect(secondResult.transactionId).toBe(firstTransactionId);

    // 2) Transactions table has exactly 1 row
    const transactions = await knex('transactions')
      .where({ idempotency_key: idempotencyKey, type: 'TRANSFER' });

    expect(transactions).toHaveLength(1);
    expect(transactions[0].transaction_id).toBe(firstTransactionId);
    expect(transactions[0].status).toBe('SUCCEEDED');

    // 3) Ledger entries table has exactly 2 rows total
    const ledgerEntries = await knex('ledger_entries')
      .where({ transaction_id: firstTransactionId });

    expect(ledgerEntries).toHaveLength(2);

    // Verify debit and credit entries
    const debitEntry = ledgerEntries.find(e => Number(e.amount) < 0);
    const creditEntry = ledgerEntries.find(e => Number(e.amount) > 0);

    expect(debitEntry).toBeDefined();
    expect(Number(debitEntry.amount)).toBe(-transferAmount);
    expect(debitEntry.account_id).toBe(fromAccountId);

    expect(creditEntry).toBeDefined();
    expect(Number(creditEntry.amount)).toBe(transferAmount);
    expect(creditEntry.account_id).toBe(toAccountId);

    // 4) Account balances are unchanged after the second call
    const balancesAfterSecondCall = {
      from: await knex('accounts').where({ account_id: fromAccountId }).first(),
      to: await knex('accounts').where({ account_id: toAccountId }).first()
    };

    expect(Number(balancesAfterSecondCall.from.current_balance))
      .toBe(Number(balancesAfterFirstCall.from.current_balance));
    expect(Number(balancesAfterSecondCall.to.current_balance))
      .toBe(Number(balancesAfterFirstCall.to.current_balance));

    // Verify final balances are correct (only one transfer applied)
    expect(Number(balancesAfterSecondCall.from.current_balance))
      .toBe(initialFromBalance - transferAmount); // 10000 - 3000 = 7000
    expect(Number(balancesAfterSecondCall.to.current_balance))
      .toBe(initialToBalance + transferAmount);   // 5000 + 3000 = 8000

    // 5) Audit logs table still has only 2 rows: one ATTEMPTED, one SUCCEEDED
    const auditLogs = await knex('audit_logs')
      .where({ target_id: firstTransactionId, target_type: 'TRANSACTION', action: 'TRANSFER' })
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