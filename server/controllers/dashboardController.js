const MentorProfile = require('../models/MentorProfile');
const MenteeProfile = require('../models/MenteeProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const MentorshipConnection = require('../models/MentorshipConnection');
const Session = require('../models/Session');
const Goal = require('../models/Goal');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { wrap } = require('../utils/http');
const { people } = require('../services/directoryService');
const { scoreMany } = require('../services/matchService');

exports.summary = wrap(async (req, res) => {
  const me = req.user._id; const now = new Date();
  const notifications = await Notification.find({ user: me }).sort({ createdAt: -1 }).limit(5).lean();

  if (req.user.role === 'mentor') {
    const [mp, pending, active, upcomingCount, nextSessions, reviews, pendingReqs] = await Promise.all([
      MentorProfile.findOne({ user: me }).lean(),
      MentorshipRequest.countDocuments({ mentor: me, status: 'pending' }),
      MentorshipConnection.countDocuments({ mentor: me, status: 'active' }),
      Session.countDocuments({ mentor: me, status: 'scheduled', scheduledAt: { $gte: now } }),
      Session.find({ mentor: me, status: 'scheduled', scheduledAt: { $gte: now } }).sort({ scheduledAt: 1 }).limit(4).lean(),
      Feedback.find({ to: me }).sort({ createdAt: -1 }).limit(3).lean(),
      MentorshipRequest.find({ mentor: me, status: 'pending' }).sort({ createdAt: -1 }).limit(3).lean()
    ]);
    const dir = await people([...nextSessions.map((s) => s.mentee), ...reviews.map((r) => r.from), ...pendingReqs.map((r) => r.mentee)]);
    return res.json({
      role: 'mentor',
      stats: { pendingRequests: pending, activeMentees: active, maxMentees: mp.maxMentees, upcomingSessions: upcomingCount, ratingAvg: mp.ratingAvg, ratingCount: mp.ratingCount, accepting: mp.isAcceptingMentees },
      pendingRequests: pendingReqs.map((r) => ({ id: r._id, createdAt: r.createdAt, message: r.message, matchScore: r.matchScore ?? null, person: dir.get(String(r.mentee)) })),
      nextSessions: nextSessions.map((s) => ({ id: s._id, title: s.title, scheduledAt: s.scheduledAt, durationMin: s.durationMin, mode: s.mode, person: dir.get(String(s.mentee)) })),
      reviews: reviews.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, from: dir.get(String(r.from))?.name || 'Student' })),
      notifications
    });
  }

  const [profile, pending, conns, upcomingCount, nextSessions, goals] = await Promise.all([
    MenteeProfile.findOne({ user: me }).lean(),
    MentorshipRequest.find({ mentee: me, status: 'pending' }).select('mentor').lean(),
    MentorshipConnection.find({ mentee: me, status: 'active' }).select('mentor').lean(),
    Session.countDocuments({ mentee: me, status: 'scheduled', scheduledAt: { $gte: now } }),
    Session.find({ mentee: me, status: 'scheduled', scheduledAt: { $gte: now } }).sort({ scheduledAt: 1 }).limit(4).lean(),
    Goal.find({ mentee: me }).sort({ updatedAt: -1 }).lean()
  ]);
  const excluded = [...pending.map((p) => p.mentor), ...conns.map((c) => c.mentor)];
  const candidates = await MentorProfile.find({ user: { $nin: excluded }, isAcceptingMentees: true, headline: { $ne: '' }, 'skills.0': { $exists: true } }).limit(100).populate('user', 'name avatar').lean();
  const live = candidates.filter((c) => c.user);
  const scores = await scoreMany(profile, live);
  const recommended = scores ? live.map((c) => ({ c, m: scores.get(String(c.user._id)) })).filter((x) => x.m && x.m.score > 0).sort((a, b) => b.m.score - a.m.score).slice(0, 3)
    .map(({ c, m }) => ({ id: String(c.user._id), name: c.user.name, headline: c.headline, skills: c.skills.slice(0, 4), ratingAvg: c.ratingAvg, ratingCount: c.ratingCount, match: m })) : [];
  const dir = await people(nextSessions.map((s) => s.mentor));
  const avg = goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0;
  res.json({
    role: 'mentee',
    stats: { activeMentors: conns.length, pendingRequests: pending.length, upcomingSessions: upcomingCount, goalsTotal: goals.length, goalsCompleted: goals.filter((g) => g.status === 'completed').length, avgProgress: avg },
    recommended, matchingAvailable: !!scores,
    nextSessions: nextSessions.map((s) => ({ id: s._id, title: s.title, scheduledAt: s.scheduledAt, durationMin: s.durationMin, mode: s.mode, person: dir.get(String(s.mentor)) })),
    goals: goals.slice(0, 4).map((g) => ({ id: g._id, title: g.title, progress: g.progress, status: g.status, targetDate: g.targetDate })),
    notifications
  });
});

exports.publicStats = wrap(async (req, res) => {
  const [mentors, mentees, connections] = await Promise.all([
    MentorProfile.countDocuments({ headline: { $ne: '' } }), User.countDocuments({ role: 'mentee' }), MentorshipConnection.countDocuments({})
  ]);
  res.json({ mentors, mentees, connections });
});
