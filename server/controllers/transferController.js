/**
 * transferController.js
 *
 * Responsibilities:
 * - Extract HTTP request data
 * - Call transferService
 * - Map domain result objects to HTTP responses
 * - Delegate ALL thrown errors to global error middleware via next(error)
 *
 * Must NOT:
 * - Contain business logic
 * - Perform DB operations
 * - Perform idempotency logic
 * - Classify system errors
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
    return next(error);
  }
}

/**
 * Maps domain result objects to HTTP responses.
 * Only handles SUCCESS and REJECTED states.
 * Must not handle thrown system errors.
 */
function mapDomainResultToHttp(result, res) {
  if (!result || typeof result !== 'object') {
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  const { success, transactionId, status, reason, idempotentReplay } = result;

  if (success === true && status === 'SUCCEEDED') {
    const httpStatus = idempotentReplay === true ? 200 : 201;
    return res.status(httpStatus).json({ transactionId, status });
  }

  if (success === false && status === 'REJECTED') {
    return res.status(422).json({ transactionId, status, reason });
  }

  return res.status(500).json({ error: 'Internal Server Error' });
}

module.exports = {
  createTransfer
};