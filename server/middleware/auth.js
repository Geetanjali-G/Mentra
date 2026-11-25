const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.COOKIE = 'mentra_token';

exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = (req.cookies && req.cookies[exports.COOKIE]) || (header.startsWith('Bearer ') ? header.slice(7) : null);
    if (!token) return res.status(401).json({ message: 'Please log in to continue' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Account not available' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
};

const { isAlphaAdmin } = require('../utils/alpha');
exports.requireAlpha = (req, res, next) =>
  isAlphaAdmin(req.user.email) ? next() : res.status(403).json({ message: 'Alpha report is restricted to test organisers' });

exports.requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have access to this resource' });
