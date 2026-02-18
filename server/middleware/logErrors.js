/**
 * logErrors
 *
 * Responsibility:
 * - Log error details for debugging and monitoring
 * - NEVER send HTTP responses
 * - Always pass error to next middleware
 *
 * This middleware must be placed BEFORE the global errorHandler.
 */

const logErrors = (err, req, res, next) => {
  console.error({
    message: err.message,
    stack: err.stack,
    code: err.code || null,
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });

  // Pass error to the next error-handling middleware
  next(err);
};

module.exports = logErrors;
