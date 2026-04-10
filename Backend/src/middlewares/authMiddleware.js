const jwt = require('jsonwebtoken');

// 1. Check if token exists and is valid
const protect = (req, res, next) => {
  let token;

  // Check if header has Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to the request object
      req.user = decoded; 
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// 2. Check if the logged-in user is specifically an Admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized: Admin access only' });
  }
};

module.exports = { protect, adminOnly };