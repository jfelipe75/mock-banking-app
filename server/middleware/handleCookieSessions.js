const cookieSession = require('cookie-session');

const handleCookieSessions = cookieSession({
  name: 'session', // this creates a req.session property holding the cookie
  keys: [process.env.SESSION_SECRET], // this secret is used to hash the cookie
  httpOnly: true,
  sameSite: 'strict', // if cross-site block cookies
  secure: process.env.NODE_ENV === 'production', // requires HTTPS
});

module.exports = handleCookieSessions;
