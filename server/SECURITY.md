## Rate limiting

# Two layers of protection

1. Global IP Limiter(basic DDoS shield)
- Limits requests per IP to /api/transfers

target:
- 60 requests per minute per IP

File Structure:

middleware/globalLimiter

2. Per-User Limiter
- Limits request per authenticated user.

target:
- 20 transfers per minute per user

this prevents authenticated abuse

File Structure:

location: middleware/rateLimiters.js