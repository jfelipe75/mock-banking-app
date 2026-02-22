// middleware/corsConfig.js
const cors = require('cors');

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN, // e.g. "http://localhost:5173" OR "https://app.yourdomain.com"
].filter(Boolean);

module.exports = cors({
  origin: (origin, callback) => {
    // allow same-origin / non-browser clients (no Origin header)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error('CORS_NOT_ALLOWED'));
  },
  credentials: true, // needed if frontend is on a different ORIGIN (like localhost:5173 -> localhost:3000)
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key'],
});
