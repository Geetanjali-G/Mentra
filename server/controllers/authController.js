const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MentorProfile = require('../models/MentorProfile');
const MenteeProfile = require('../models/MenteeProfile');
const { wrap, fail } = require('../utils/http');
const { profileFor, isComplete } = require('../services/profileService');
const { COOKIE } = require('../middleware/auth');
const { isAlphaAdmin } = require('../utils/alpha');

const cookieOpts = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
const issue = (res, user) => res.cookie(COOKIE,
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' }),
  { ...cookieOpts(), maxAge: 7 * 24 * 60 * 60 * 1000 });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar });
const session = async (user) => ({ user: publicUser(user), profileComplete: isComplete(user.role, await profileFor(user)), alphaAdmin: isAlphaAdmin(user.email) });

exports.register = wrap(async (req, res) => {
  const { name, email, password, role } = req.body;
  let user;
  try { user = await User.create({ name, email, password, role }); }
  catch (e) { if (e.code === 11000) throw fail(409, 'An account with this email already exists'); throw e; }
  await (role === 'mentor' ? MentorProfile : MenteeProfile).create({ user: user._id });
  issue(res, user);
  res.status(201).json(await session(user));
});

exports.login = wrap(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(String(req.body.password || '')))) throw fail(401, 'Incorrect email or password');
  if (!user.isActive) throw fail(403, 'This account has been disabled');
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  issue(res, user);
  res.json(await session(user));
});

exports.logout = (req, res) => { res.clearCookie(COOKIE, cookieOpts()); res.json({ message: 'Logged out' }); };
exports.me = wrap(async (req, res) => res.json(await session(req.user)));
