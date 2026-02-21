/**
 * rateLimiters.js
 *
 * Implements rate limiting for transfer endpoints.
 *
 * Includes:
 * - IP-based rate limiter
 * - User-based rate limiter
 *
 * These limiters:
 * - Do NOT replace authentication
 * - Do NOT replace validation
 * - Exist purely to mitigate abuse
 */

const rateLimit = require('express-rate-limit');
/**
 * IMPLEMENTATION REQUIREMENTS:
 *
 * Create an IP-based rate limiter for /api/transfers.
 *
 * Requirements:
 * - Window: 1 minute
 * - Max: 60 requests per IP
 * - Standard headers enabled
 * - Legacy headers disabled
 * - Response:
 *   {
 *     success: false,
 *     error: 'RATE_LIMIT_EXCEEDED'
 *   }
 *
 * This limiter applies per IP address.
 */

const transferIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * IMPLEMENTATION REQUIREMENTS:
 *
 * Create a per-user rate limiter.
 *
 * Requirements:
 * - Window: 1 minute
 * - Max: 20 requests per authenticated user
 * - Key should be req.user.id
 * - If req.user is missing, fallback to IP
 * - Same response format as IP limiter
 *
 * Must NOT talk to database.
 */

const transferUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

module.exports = {
  transferIpLimiter,
  transferUserLimiter
};
