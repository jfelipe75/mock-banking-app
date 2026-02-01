/**
 * Transfer Service
 *
 * Responsibility:
 * - Execute a money transfer as a single atomic unit of work
 *
 * Core rules:
 * - ledger_entries is the source of truth
 * - accounts.current_balance is a denormalized cache
 * - balance updates + ledger inserts happen in the same DB transaction
 * - idempotency enforced for TRANSFER only
 * - audit_logs are append-only and observational
 *
 * This file:
 * - contains NO HTTP logic
 * - does NOT return HTTP responses
 * - returns domain results only
 */

const knex = require('../db/knex');

async function transferFunds({
  initiatorUserId,
  fromAccountId,
  toAccountId,
  amount,
  idempotencyKey
}) {
  /**
   * STEP 0 — Validate input shape (cheap, synchronous)
   * --------------------------------------------------
   * - amount > 0
   * - fromAccountId !== toAccountId
   * - idempotencyKey present (required for TRANSFER)
   *
   * Fail fast before opening a DB transaction.
   */
  if (amount <= 0) {
    return { // pre-transaction validation
      success: false,
      error: 'INVALID_AMOUNT',
      message: 'Amount must be greater than 0'
    };
  }

  if (fromAccountId === toAccountId) {
    return {
      success: false,
      error: 'SAME_ACCOUNT',
      message: 'Cannot transfer to the same account'
    };
  }

  if (!idempotencyKey) {
    return {
      success: false,
      error: 'MISSING_IDEMPOTENCY_KEY',
      message: 'Idempotency key is required for TRANSFER'
    };
  }

  /**
   * STEP 1 — Open DB transaction
   * ----------------------------
   * All subsequent steps must run inside this transaction.
   *
   * If ANY step throws:
   * - the DB transaction is rolled back
   * - no balances change
   * - no ledger entries exist
   */
  
  try {
    return await knex.transaction(async (trx) => {
      /**
       * STEP 2 — Idempotency check (TRANSFER only)
     * ------------------------------------------
     * Look up existing transaction by:
     * (initiator_user_id, idempotency_key, type = TRANSFER)
     *
     * If found:
     * - return the stored response_payload
     * - DO NOT re-apply side effects
     */
    const existingTransaction = await trx('transactions')
      .where({
        initiator_user_id: initiatorUserId,
        idempotency_key: idempotencyKey,
        type: 'TRANSFER'
      })
      .first();

    if (existingTransaction) {
      // Return stored response_payload for idempotent replay
      return existingTransaction.response_payload;
    }

    /**
     * STEP 3 — Create transaction row (PENDING)
     * ------------------------------------------
     * Insert into transactions:
     * - status = PENDING
     * - type = TRANSFER
     * - initiator_user_id
     * - from_account_id
     * - to_account_id
     * - amount
     * - idempotency_key
     */
    const [transactionRow] = await trx('transactions')
      .insert({
        status: 'PENDING',
        type: 'TRANSFER',
        initiator_user_id: initiatorUserId,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: amount,
        idempotency_key: idempotencyKey
      })
      .returning('*');

    const transactionId = transactionRow.transaction_id;

    /**
     * STEP 4 — Audit ATTEMPT
     * ----------------------
     * Insert into audit_logs:
     * - actor_type = USER
     * - actor_id = initiatorUserId
     * - action = TRANSFER
     * - target_type = TRANSACTION
     * - target_id = transaction_id
     * - outcome = ATTEMPTED
     */
    await trx('audit_logs').insert({
      actor_type: 'USER',
      actor_id: initiatorUserId,
      action: 'TRANSFER',
      target_type: 'TRANSACTION',
      target_id: transactionId,
      outcome: 'ATTEMPTED'
    });

    /**
     * STEP 5 — Business eligibility checks
     * ------------------------------------
     * - from_account exists and is ACTIVE
     * - to_account exists and is ACTIVE
     *
     * If NOT eligible:
     * - update transaction status = REJECTED
     * - write audit_log with outcome = REJECTED
     * - COMMIT transaction
     * - return rejection result
     */
    const fromAccount = await trx('accounts')
      .where({ account_id: fromAccountId })
      .first();

    const toAccount = await trx('accounts')
      .where({ account_id: toAccountId })
      .first();

    let rejectionReason = null;

    if (!fromAccount) {
      rejectionReason = 'FROM_ACCOUNT_NOT_FOUND';
    } else if (fromAccount.status !== 'ACTIVE') {
      rejectionReason = 'FROM_ACCOUNT_NOT_ACTIVE';
    } else if (!toAccount) {
      rejectionReason = 'TO_ACCOUNT_NOT_FOUND';
    } else if (toAccount.status !== 'ACTIVE') {
      rejectionReason = 'TO_ACCOUNT_NOT_ACTIVE';
    }

    if (rejectionReason) {
      const rejectionPayload = {
        success: false,
        transactionId: transactionId,
        status: 'REJECTED',
        reason: rejectionReason
      };

      await trx('transactions')
        .where({ transaction_id: transactionId })
        .update({
          status: 'REJECTED',
          failure_reason: rejectionReason,
          response_payload: rejectionPayload
        });

      await trx('audit_logs').insert({
        actor_type: 'USER',
        actor_id: initiatorUserId,
        action: 'TRANSFER',
        target_type: 'TRANSACTION',
        target_id: transactionId,
        outcome: 'REJECTED',
        reason: rejectionReason
      });

      // COMMIT transaction (implicit via return) and return rejection result
      return rejectionPayload;
    }

    /**
     * STEP 6 — Atomic balance updates
     * -------------------------------
     * Perform conditional updates:
     *
     * 1) Debit:
     * UPDATE accounts
     * SET current_balance = current_balance - amount
     * WHERE account_id = fromAccountId
     *   AND current_balance >= amount
     *   AND status = 'ACTIVE'
     *
     * 2) Credit:
     * UPDATE accounts
     * SET current_balance = current_balance + amount
     * WHERE account_id = toAccountId
     *   AND status = 'ACTIVE'
     *
     * If either update affects 0 rows:
     * - treat as REJECTED
     * - rollback via throw OR explicit handling
     */
    const debitRowsAffected = await trx('accounts')
      .where({ account_id: fromAccountId, status: 'ACTIVE' })
      .whereRaw('current_balance >= ?', [amount])
      .update({
        current_balance: trx.raw('current_balance - ?', [amount])
      });

    if (debitRowsAffected === 0) {
      // Insufficient funds or account state changed
      const rejectionPayload = {
        success: false,
        transactionId: transactionId,
        status: 'REJECTED',
        reason: 'INSUFFICIENT_FUNDS'
      };

      await trx('transactions')
        .where({ transaction_id: transactionId })
        .update({
          status: 'REJECTED',
          failure_reason: 'INSUFFICIENT_FUNDS',
          response_payload: JSON.stringify(rejectionPayload)
        });

      await trx('audit_logs').insert({
        actor_type: 'USER',
        actor_id: initiatorUserId,
        action: 'TRANSFER',
        target_type: 'TRANSACTION',
        target_id: transactionId,
        outcome: 'REJECTED',
        reason: 'INSUFFICIENT_FUNDS'
      });

      return rejectionPayload;
    }

    const creditRowsAffected = await trx('accounts')
      .where({ account_id: toAccountId, status: 'ACTIVE' })
      .update({
        current_balance: trx.raw('current_balance + ?', [amount])
      });

    if (creditRowsAffected === 0) {
      // Credit failed (account state changed during transaction)
      // This should be very rare given the eligibility check above
      // Throw to rollback the entire transaction including the debit
      throw new Error('CREDIT_FAILED_ROLLBACK');
      // NOTE:
      // This represents a system failure.
      // Transaction remains PENDING and may be marked FAILED by a recovery process.
    }

    /**
     * STEP 7 — Write ledger entries (ONLY if balance updates succeeded)
     * -----------------------------------------------------------------
     * Insert two rows into ledger_entries:
     * - debit entry (negative amount)
     * - credit entry (positive amount)
     */
    await trx('ledger_entries').insert([
      {
        account_id: fromAccountId,
        transaction_id: transactionId,
        amount: -amount // debit entry (negative)
      },
      {
        account_id: toAccountId,
        transaction_id: transactionId,
        amount: amount // credit entry (positive)
      }
    ]);

    /**
     * STEP 8 — Mark transaction SUCCEEDED
     * -----------------------------------
     * Update transactions.status = SUCCEEDED
     * Store response_payload for idempotent replay
     */
    const successPayload = {
      success: true,
      transactionId: transactionId,
      status: 'SUCCEEDED',
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: amount
    };

    await trx('transactions')
      .where({ transaction_id: transactionId })
      .update({
        status: 'SUCCEEDED',
        response_payload: successPayload
      });

    /**
     * STEP 9 — Audit SUCCESS
     * ----------------------
     * Insert into audit_logs:
     * - action = TRANSFER
     * - outcome = SUCCEEDED
     */
    await trx('audit_logs').insert({
      actor_type: 'USER',
      actor_id: initiatorUserId,
      action: 'TRANSFER',
      target_type: 'TRANSACTION',
      target_id: transactionId,
      outcome: 'SUCCEEDED'
    });

    /**
     * STEP 10 — Commit DB transaction
     * --------------------------------
     * At this point:
     * - balances are correct
     * - ledger is correct
     * - audit reflects reality
     */
    // Commit is implicit when the transaction callback returns successfully

    /**
     * STEP 11 — Return domain result
     * ------------------------------
     * Return:
     * - transaction_id
     * - status
     * - balances (optional)
     */
    return successPayload;
    });
  } catch (error) {
    // Log system failure (transaction is already rolled back by Knex)
    console.error('[TransferService] System failure during transfer:', {
      initiatorUserId,
      fromAccountId,
      toAccountId,
      amount,
      idempotencyKey,
      error: error.message
    });

    // Rethrow cleanly
    throw new Error(`TRANSFER_SYSTEM_FAILURE: ${error.message}`);
  }
}

module.exports = {
  transferFunds
};
