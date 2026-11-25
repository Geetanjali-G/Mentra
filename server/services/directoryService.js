const User = require('../models/User');
const MentorProfile = require('../models/MentorProfile');
const MenteeProfile = require('../models/MenteeProfile');

// Returns Map(userId -> public summary incl. role-specific profile fields). Never includes email.
exports.people = async (ids) => {
  const uniq = [...new Set(ids.filter(Boolean).map(String))];
  if (!uniq.length) return new Map();
  const [users, mentors, mentees] = await Promise.all([
    User.find({ _id: { $in: uniq } }).select('name avatar role').lean(),
    MentorProfile.find({ user: { $in: uniq } }).select('user headline department organization skills expertise availability ratingAvg ratingCount').lean(),
    MenteeProfile.find({ user: { $in: uniq } }).select('user college department year skills interests learningGoals').lean()
  ]);
  const mp = new Map(mentors.map((p) => [String(p.user), p]));
  const tp = new Map(mentees.map((p) => [String(p.user), p]));
  return new Map(users.map((u) => {
    const id = String(u._id);
    const p = (u.role === 'mentor' ? mp.get(id) : tp.get(id)) || {};
    delete p.user; delete p._id;
    return [id, { id, name: u.name, avatar: u.avatar, role: u.role, ...p }];
  }));
};
