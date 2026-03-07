/**
 * AuthError Class
 * 
 * A custom error class for authentication-related errors.
 * Extends the native JavaScript Error class to provide structured
 * error information for the global error handler.
 * 
 * Features:
 * - Preserves original stack trace
 * - Includes machine-readable error code
 * - Includes HTTP status code
 * - Exposes client-safe error messages
 * 
 * Usage:
 *   throw new AuthError('USER_NOT_FOUND', 'User does not exist.', 404);
 *   throw AuthError.userNotFound();
 */

class AuthError extends Error {
  /**
   * Create an AuthError instance.
   * 
   * @param {string} code - Machine-readable error code (e.g., 'USER_NOT_FOUND')
   * @param {string} message - Client-safe error message
   * @param {number} [statusCode=401] - HTTP status code (defaults to 401 Unauthorized)
   */
  constructor(code, message, statusCode = 401) {
    super(message);
    
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    
    // Preserve stack trace (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // ================================
  // Static Factory Methods
  // ================================

  /**
   * User not found during login.
   * @returns {AuthError}
   */
  static userNotFound() {
    return new AuthError(
      'USER_NOT_FOUND',
      'User with this email does not exist.',
      404
    );
  }

  /**
   * Invalid credentials (wrong password).
   * Uses generic message to prevent user enumeration.
   * @returns {AuthError}
   */
  static invalidCredentials() {
    return new AuthError(
      'INVALID_CREDENTIALS',
      'Invalid email or password.',
      401
    );
  }

  /**
   * User already exists during signup.
   * @returns {AuthError}
   */
  static userAlreadyExists() {
    return new AuthError(
      'USER_ALREADY_EXISTS',
      'An account with this email already exists.',
      409
    );
  }

  /**
   * User is not authenticated (no valid session).
   * @returns {AuthError}
   */
  static unauthenticated() {
    return new AuthError(
      'UNAUTHENTICATED',
      'Authentication required. Please log in.',
      401
    );
  }

  /**
   * Invalid or missing CSRF token.
   * @returns {AuthError}
   */
  static invalidCsrfToken() {
    return new AuthError(
      'CSRF_TOKEN_INVALID',
      'Invalid or missing CSRF token.',
      403
    );
  }

  /**
   * Session expired.
   * @returns {AuthError}
   */
  static sessionExpired() {
    return new AuthError(
      'SESSION_EXPIRED',
      'Your session has expired. Please log in again.',
      401
    );
  }

  /**
   * Missing required fields in request.
   * @param {string} [field] - Optional field name
   * @returns {AuthError}
   */
  static missingCredentials(field) {
    const message = field 
      ? `Missing required field: ${field}`
      : 'Username and password are required.';
    return new AuthError(
      'MISSING_CREDENTIALS',
      message,
      400
    );
  }
}

module.exports = AuthError;
