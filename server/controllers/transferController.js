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
exports.createTransfer = async function createTransfer(req, res, next) {
  try {
    const initiatorUserId = req.session.userId;
    const { fromAccountId, toAccountId, amount } = req.body;
    const idempotencyKey = req.header('Idempotency-Key');

    const result = await transferService.transferFunds({
      initiatorUserId,
      fromAccountId,
      toAccountId,
      amount,
      idempotencyKey,
    });

    return mapDomainResultToHttp(result, res);
  } catch (error) {
    return next(error);
  }
};

/**
 * Maps domain result objects to HTTP responses.
 * Only handles SUCCESS and REJECTED states.
 * Must not handle thrown system errors.
 */
function mapDomainResultToHttp(result, res) {
  if (!result || typeof result !== 'object') {
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  const { success, transactionId, status, reason } = result;

  if (success === true && status === 'SUCCEEDED') {
    return res.status(201).json({ transactionId, status });
  }
  if (success === false && status === 'REJECTED') {
    return res.status(422).json({ transactionId, status, reason });
  }

  return res.status(500).json({ error: 'Internal Server Error' });
}
