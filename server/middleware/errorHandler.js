/**
 * Global Error Middleware
 *
 * Responsibilities:
 * - Convert domain/infrastructure errors into HTTP responses
 * - Provide stable machine-readable error codes
 * - Avoid leaking internal implementation details
 *
 * Must NOT:
 * - Contain business logic
 * - Modify domain state
 * - Swallow unexpected errors silently
 */

const TransferSystemError = require('../errors/transferSystemError');

function errorHandler(err, req, res, next) {
  // If response already started, delegate
  if (res.headersSent) {
    return next(err);
  }

  // Handle TransferSystemError
  if (err instanceof TransferSystemError) {
    return res.status(500).json({
      success: false,
      error: 'TRANSFER_SYSTEM_FAILURE',
    });
  }

  // Fallback for unknown/unexpected errors
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
  });
}

module.exports = errorHandler;
