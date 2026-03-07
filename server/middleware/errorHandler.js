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
const AuthError = require('../errors/AuthError');

function errorHandler(err, req, res, next) {
  // If response already started, delegate
  if (res.headersSent) {
    return next(err);
  }

  // Handle AuthError
  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
  }

  // Handle TransferSystemError
  if (err instanceof TransferSystemError) {
    return res.status(500).json({
      success: false,
      error: 'TRANSFER_SYSTEM_FAILURE',
    });
  }

  // Log unexpected errors for debugging (server-side only)
  console.error('[ErrorHandler] Unexpected error:', err);

  // Fallback for unknown/unexpected errors
  // Never expose internal details to the client
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
  });
}

module.exports = errorHandler;
