const MentorProfile = require('../models/MentorProfile');
const MenteeProfile = require('../models/MenteeProfile');

exports.profileFor = (user) =>
  (user.role === 'mentor' ? MentorProfile : MenteeProfile).findOne({ user: user._id });

exports.isComplete = (role, p) => {
  if (!p) return false;
  if (role === 'mentor') return !!(p.headline && p.bio && p.skills && p.skills.length);
  return !!(p.learningGoals && ((p.interests && p.interests.length) || (p.skills && p.skills.length)));
};
