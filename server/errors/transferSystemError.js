/**
 * TransferSystemError
 *
 * Represents infrastructure-level failures that prevent
 * the transfer from completing reliably.
 *
 * IMPORTANT:
 * - This should ONLY be thrown by the service layer.
 * - Business rule violations must NOT throw this error.
 * - This class must NOT contain HTTP-related logic.
 */

class TransferSystemError extends Error {
  constructor(message, options = {}) {
    // super() calls the constructor in parent class
    super(message);

    this.name = 'TransferSystemError';
    this.code = 'TRANSFER_SYSTEM_FAILURE';
    
    if (options.metadata) {
      this.metadata = options.metadata;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = TransferSystemError;
