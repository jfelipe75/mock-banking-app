/**
 * Database Error Translator
 * 
 * Centralized utility for translating PostgreSQL database errors
 * into domain-specific application errors.
 * 
 * This keeps database logic separate from business logic and ensures
 * consistent error handling across the entire API.
 * 
 * Architecture:
 *   Database Error → translateDatabaseError() → Domain Error → Global Error Handler → API Response
 * 
 * Usage:
 *   try {
 *     await knex.raw(query, params);
 *   } catch (err) {
 *     throw translateDatabaseError(err);
 *   }
 */

const AuthError = require('../errors/AuthError');

// PostgreSQL Error Codes
// Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
};

// Constraint name to error mapping
const CONSTRAINT_ERROR_MAP = {
  // User-related constraints
  'users_username_unique': () => AuthError.userAlreadyExists(),
  'users_email_unique': () => AuthError.userAlreadyExists(),
};

/**
 * Translate a PostgreSQL database error into a domain-specific error.
 * 
 * @param {Error} err - The original database error
 * @returns {Error} - A domain error (AuthError, etc.) or the original error if not recognized
 */
function translateDatabaseError(err) {
  // Handle unique constraint violations (code: 23505)
  if (err.code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
    const constraintHandler = CONSTRAINT_ERROR_MAP[err.constraint];
    if (constraintHandler) {
      return constraintHandler();
    }
    // Unknown unique constraint - return generic error
    // The global error handler will log it and return 500
  }

  // Handle foreign key violations (code: 23503)
  if (err.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    // Can be extended to handle specific FK constraints
    // Example: if (err.constraint === 'accounts_user_id_fkey') { ... }
  }

  // Handle not null violations (code: 23502)
  if (err.code === PG_ERROR_CODES.NOT_NULL_VIOLATION) {
    // Can be extended to handle missing required fields
  }

  // Return the original error if not recognized
  // This will be caught by the global error handler
  return err;
}

module.exports = translateDatabaseError;
