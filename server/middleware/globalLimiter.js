/**
 * globalLimiter.js
 *
 * Global API rate limiter.
 *
 * Purpose:
 * - Protect entire /api surface from abuse
 * - Mitigate volumetric attacks
 * - Provide baseline DDoS resistance
 *
 * This limiter:
 * - Applies to all /api routes
 * - Is IP-based
 * - Does NOT rely on authentication
 * * Must be safe behind reverse proxy (trust proxy enabled)
 *
 * Must NOT:
 * - Contain business logic
 * - Access database
 * - Interfere with domain-level rules
 */

const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: 'GLOBAL_RATE_LIMIT_EXCEEDED'
    });
  }
});

module.exports = globalLimiter;
