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
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * IP-based rate limiter for /api/transfers
 */
const transferIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: ipKeyGenerator, // IPv6-safe
  skip: (req) => req.method === 'OPTIONS',
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Per-user rate limiter for /api/transfers
 */
const transferUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // If authenticated, key by user id.
    // Otherwise, fallback to IPv6-safe IP key.
    return req.user?.id || ipKeyGenerator(req);
  },
  skip: (req) => req.method === 'OPTIONS',
  handler: (_req, res) => {
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
