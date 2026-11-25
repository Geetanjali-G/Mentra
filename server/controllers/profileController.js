const User = require('../models/User');
const { wrap } = require('../utils/http');
const { profileFor, isComplete } = require('../services/profileService');

const FIELDS = {
  mentor: ['headline', 'bio', 'department', 'organization', 'yearsExperience', 'skills', 'expertise', 'interests', 'maxMentees', 'isAcceptingMentees', 'availability'],
  mentee: ['college', 'department', 'year', 'bio', 'skills', 'interests', 'learningGoals']
};

exports.getMine = wrap(async (req, res) => {
  const profile = await (await profileFor(req.user)).toObject();
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }, profile, profileComplete: isComplete(req.user.role, profile) });
});

exports.updateMine = wrap(async (req, res) => {
  const profile = await profileFor(req.user);
  const NUMERIC = ['yearsExperience', 'maxMentees', 'year'];
  for (const k of FIELDS[req.user.role]) {
    const v = req.body[k];
    if (v === undefined) continue;
    if (v === '' && NUMERIC.includes(k)) { if (k === 'year') profile[k] = undefined; continue; } // blank number keeps its stored value
    profile[k] = v;
  }
  await profile.save();
  if (req.body.name) await User.updateOne({ _id: req.user._id }, { name: req.body.name });
  res.json({ message: 'Profile saved', profileComplete: isComplete(req.user.role, profile) });
});
