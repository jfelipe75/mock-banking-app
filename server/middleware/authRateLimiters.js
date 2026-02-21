/**
 * authRateLimiters.js
 *
 * Rate limiting specifically for authentication endpoints.
 *
 * Purpose:
 * - Protect login endpoint from brute-force attacks
 * - Mitigate credential stuffing
 * - Provide layered throttling (IP + username)
 *
 * These limiters:
 * - DO NOT contain business logic
 * - DO NOT access the database
 * - DO NOT track success/failure attempts
 * - ONLY limit request velocity
 *
 * Authentication failure tracking / lockout logic
 * must live in the domain/service layer.
 */

const rateLimit = require('express-rate-limit');

/**
 * IP-based login limiter
 *
 * Limits total login attempts per IP address.
 *
 * Should:
 * - Apply to /api/auth/login
 * - Use req.ip as key
 * - Be stricter than global limiter
 * - Return HTTP 429
 */
/*IMPLEMENTATION REQUIREMENTS:

Create a loginIpLimiter using express-rate-limit with:

- windowMs: 60 * 1000 (1 minute)
- max: 20 attempts per IP per window
- standardHeaders: true
- legacyHeaders: false
- keyGenerator: use req.ip
- skipSuccessfulRequests: false
- custom handler that returns HTTP 429 with JSON:
    {
      success: false,
      error: 'LOGIN_RATE_LIMIT_EXCEEDED'
    }

Do not use the "message" property.
Explicitly implement a handler.
Do not access the database.*/
const loginIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: 'LOGIN_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Username-based login limiter
 *
 * Limits login attempts per username/email.
 *
 * Should:
 * - Use req.body.email or req.body.username as key
 * - Normalize identifier (e.g., lowercase)
 * - Fallback to req.ip if identifier missing
 * - Return HTTP 429
 */
/**
 * IMPLEMENTATION REQUIREMENTS:

Create a loginUserLimiter using express-rate-limit with:

- windowMs: 60 * 1000 (1 minute)
- max: 5 attempts per username per window
- standardHeaders: true
- legacyHeaders: false
- skipSuccessfulRequests: false

keyGenerator must:

- Use req.body.email or req.body.username
- Normalize identifier to lowercase
- If identifier missing or invalid, fallback to req.ip
- Never throw error if body missing

Use custom handler returning HTTP 429 with JSON:
    {
      success: false,
      error: 'LOGIN_USERNAME_RATE_LIMIT_EXCEEDED'
    }

Do not access database.
Do not rely on authentication.

 */
const loginUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.username;
    if (identifier && typeof identifier === 'string') {
      return identifier.trim().toLowerCase();
    }
    return req.ip;
  },
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
