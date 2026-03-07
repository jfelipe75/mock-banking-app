const User = require('../models/User');


exports.registerUser = async (req, res, next) => {
  // Request needs a body
  if (!req.body) {
    return res.status(400).send({ success: false, error: 'MISSING_CREDENTIALS', message: 'Username and password required' });
  }

  // Body needs a username and password
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({ success: false, error: 'MISSING_CREDENTIALS', message: 'Username and password required' });
  }

  try {
    // User.create will handle hashing the password and storing in the database
    // May throw AuthError.userAlreadyExists() if email is taken
    const user = await User.create(username, password);

    // Add the user id to the cookie and send the user data back
    req.session.userId = user.id;
    res.send(user);
  } catch (err) {
    // Forward error to global error handler
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  console.log('LOGIN HIT', req.body.username);
  // Request needs a body
  if (!req.body) {
    return res.status(400).send({ success: false, error: 'MISSING_CREDENTIALS', message: 'Username and password required' });
  }

  // Body needs a username and password
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({ success: false, error: 'MISSING_CREDENTIALS', message: 'Username and password required' });
  }

  try {
    // Username must be valid
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).send({ success: false, error: 'USER_NOT_FOUND', message: 'User not found.' });
    }
    console.log('login payload user=', user);

    // Password must match
    const isPasswordValid = await user.isValidPassword(password);
    if (!isPasswordValid) {
      return res.status(401).send({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' });
    }

    // Add the user id to the cookie and send the user data back
    req.session.userId = user.id;
    res.send(user);
  } catch (err) {
    // Forward error to global error handler
    next(err);
  }
};

exports.showMe = async (req, res, next) => {
  // no cookie with an id => Not authenticated.
  if (!req.session.userId) {
    return res.status(401).send({ success: false, error: 'UNAUTHENTICATED', message: 'User must be authenticated.' });
  }

  try {
    // cookie with an id => here's your user info!
    const user = await User.find(req.session.userId);
    res.send(user);
  } catch (err) {
    // Forward error to global error handler
    next(err);
  }
};

exports.logoutUser = (req, res, next) => {
  req.session = null; // "erase" the cookie
  res.status(204).send({ message: "User logged out." });
};
