/**
 * validateTransferRequest Middleware
 *
 * Responsibility:
 * - Validate shape and types of incoming transfer request
 * - Enforce strict input contract
 *
 * This middleware:
 * - DOES NOT talk to the database
 * - DOES NOT apply business logic
 * - ONLY validates request structure and types
 */

module.exports = function validateTransferRequest(req, res, next) {
  const { fromAccountId, toAccountId, amount } = req.body;
  const idempotencyKey = req.header('Idempotency-Key');

  //  Required fields check
  if (fromAccountId === undefined || toAccountId === undefined || amount === undefined) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'fromAccountId, toAccountId, and amount are required',
    });
  }

  //  Type validation (strict)
  if (typeof fromAccountId !== 'string' || typeof toAccountId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TYPE',
      message: 'Account IDs must be strings',
    });
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TYPE',
      message: 'Amount must be a valid number',
    });
  }

  // Decimal safety
  if (!Number.isInteger(amount * 100)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_AMOUNT_PRECISION',
      message: 'Amount must have at most 2 decimal places',
    });
  }

  // Check for identical accounts

  if (fromAccountId === toAccountId) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TRANSFER',
      message: 'source and destination account must differ',
    });
  }
  //  Business-shape validation (not DB logic)
  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_AMOUNT',
      message: 'Amount must be greater than zero',
    });
  }

  // 4️⃣ Idempotency header required
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key header is required',
    });
  }

  // If all checks pass → move to next layer
  next();
};
