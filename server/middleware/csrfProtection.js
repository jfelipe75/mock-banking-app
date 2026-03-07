const crypto = require('crypto');

/**
 * CSRF Protection Middleware using the Synchronizer Token Pattern.
 * 
 * - Generates a CSRF token and stores it in the session for authenticated users.
 * - Validates the token on state-changing requests (POST, PATCH, PUT, DELETE).
 * - Token is read from the 'x-csrf-token' header.
 */

const STATE_CHANGING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

/**
 * Generates a cryptographically secure CSRF token.
 * @returns {string} A 64-character hex string.
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Ensures a CSRF token exists in the session for authenticated users.
 * If no token exists, one is generated and stored.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const ensureCsrfToken = (req, res, next) => {
  // Only generate token for authenticated sessions
  if (req.session && req.session.userId) {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateCsrfToken();
    }
  }
  next();
};

/**
 * Validates CSRF token on state-changing requests.
 * Compares the 'x-csrf-token' header with the session token.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const validateCsrfToken = (req, res, next) => {
  // Only validate on state-changing methods
  if (!STATE_CHANGING_METHODS.includes(req.method)) {
    return next();
  }

  // Skip validation for unauthenticated requests (let auth middleware handle those)
  if (!req.session || !req.session.userId) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'];
  const sessionToken = req.session.csrfToken;

  // Token must exist and match
  if (!clientToken || !sessionToken || clientToken !== sessionToken) {
    return res.status(403).json({
      success: false,
      error: 'CSRF_TOKEN_INVALID'
    });
  }

  next();
};

/**
 * Controller to return the CSRF token to the client.
 * Only accessible for authenticated users.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getCsrfToken = (req, res) => {
  // Ensure user is authenticated
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_REQUIRED'
    });
  }

  // Ensure token exists (should already exist from ensureCsrfToken middleware)
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  res.json({ csrfToken: req.session.csrfToken });
};

module.exports = {
  ensureCsrfToken,
  validateCsrfToken,
  getCsrfToken
};
