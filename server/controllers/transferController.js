/**
 * transferController.js
 *
 * Responsibilities:
 * - Extract HTTP request data
 * - Call transferService
 * - Map domain result objects to HTTP responses
 * - Translate service-level system failures into HTTP 500
 *
 * Must NOT:
 * - Contain business logic
 * - Talk to DB
 * - Import knex
 * - Modify balances
 * - Perform idempotency logic
 */

const transferService = require('../services/transferService');

/**
 * POST /api/transfers
 */
async function createTransfer(req, res, next) {
  try {
    const initiatorUserId = req.user.id;
    const { fromAccountId, toAccountId, amount } = req.body;
    const idempotencyKey = req.header('Idempotency-Key');

    const result = await transferService.executeTransfer({
      initiatorUserId,
      fromAccountId,
      toAccountId,
      amount,
      idempotencyKey
    });

    return mapDomainResultToHttp(result, res);

  } catch (error) {
    return handleServiceError(error, res, next);
  }
}

/**
 * Maps domain result objects to HTTP responses.
 * This function must remain pure and only perform translation logic.
 */
function mapDomainResultToHttp(result, res) {
  // Defensive validation of service contract
  if (!result || typeof result !== 'object') {
    return res.status(500).json({
      success: false,
      error: 'INVALID_TRANSFER_RESULT'
    });
  }

  const {
    success,
    transactionId,
    status,
    reason,
    idempotentReplay
  } = result;

  // Successful transfer
  if (success === true && status === 'SUCCEEDED') {
    const httpStatus = idempotentReplay === true ? 200 : 201;

    return res.status(httpStatus).json({
      success: true,
      transactionId,
      status,
      ...(idempotentReplay === true && { idempotentReplay: true })
    });
  }

  // Business rejection
  if (success === false && status === 'REJECTED') {
    return res.status(422).json({
      success: false,
      transactionId,
      status,
      reason
    });
  }

  // Unexpected domain state (should never happen)
  return res.status(500).json({
    success: false,
    error: 'UNEXPECTED_TRANSFER_STATE'
  });
}

/**
 * Handles service-level failures.
 * Only infrastructure/system failures should reach here.
 */
function handleServiceError(error, res, next) {
  if (
    error &&
    typeof error.message === 'string' &&
    error.message.startsWith('TRANSFER_SYSTEM_FAILURE:')
  ) {
    return res.status(500).json({
      success: false,
      error: 'TRANSFER_SYSTEM_FAILURE'
    });
  }

  // Delegate all other errors to global error middleware
  return next(error);
}

module.exports = {
  createTransfer
};
