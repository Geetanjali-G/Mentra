const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, logout, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again in a few minutes.' } });

router.post('/register', limiter, validate({
  name: { type: 'string', required: true, max: 80, label: 'Name' },
  email: { type: 'email', required: true, label: 'Email' },
  password: { type: 'password', required: true, min: 8, label: 'Password' },
  role: { type: 'enum', required: true, values: ['mentee', 'mentor'], label: 'Role' }
}), register);
router.post('/login', limiter, validate({ email: { type: 'email', required: true }, password: { type: 'password', required: true, min: 1 } }), login);
router.post('/logout', logout);
router.get('/me', protect, me);

module.exports = router;
