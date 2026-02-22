/**
 * authRateLimiters.js
 *
 * Rate limiting specifically for authentication endpoints.
 */

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * IP-based login limiter
 */
const loginIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,

  // If you only want to count failed login attempts (e.g. 401/403),
  // keep this true. If you want all attempts to count, set false.
  skipSuccessfulRequests: true,

  // IPv6-safe IP key
  keyGenerator: ipKeyGenerator,

  // Don't rate-limit CORS preflights
  skip: (req) => req.method === 'OPTIONS',

  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: 'LOGIN_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Username-based login limiter
 */
const loginUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.username;

    if (typeof identifier === 'string' && identifier.trim()) {
      return `login_user:${identifier.trim().toLowerCase()}`;
    }

    // IPv6-safe fallback when identifier is missing/invalid
    return ipKeyGenerator(req);
  },

  skip: (req) => req.method === 'OPTIONS',

  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: 'LOGIN_USERNAME_RATE_LIMIT_EXCEEDED'
    });
  }
});

module.exports = {
  loginIpLimiter,
  loginUserLimiter
};
