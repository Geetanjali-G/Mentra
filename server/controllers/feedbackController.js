const Feedback = require('../models/Feedback');
const Session = require('../models/Session');
const MentorProfile = require('../models/MentorProfile');
const MentorshipConnection = require('../models/MentorshipConnection');
const { wrap, fail } = require('../utils/http');
const { people } = require('../services/directoryService');
const { notify } = require('../services/notifyService');

async function recompute(mentorId) {
  const [agg] = await Feedback.aggregate([{ $match: { to: mentorId } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await MentorProfile.updateOne({ user: mentorId }, { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.n : 0 });
}

exports.create = wrap(async (req, res) => {
  const { connectionId, sessionId, rating, comment } = req.body;
  const conn = await MentorshipConnection.findOne({ _id: connectionId, mentee: req.user._id });
  if (!conn) throw fail(404, 'Mentorship not found');
  if (sessionId) {
    const s = await Session.findOne({ _id: sessionId, connection: conn._id, mentee: req.user._id, status: 'completed' });
    if (!s) throw fail(400, 'You can only rate sessions that were completed');
    if (await Feedback.exists({ session: s._id, from: req.user._id })) throw fail(409, 'You already rated this session');
  } else if (await Feedback.exists({ connection: conn._id, from: req.user._id, session: { $exists: false } })) {
    throw fail(409, 'You already left overall feedback for this mentor. Rate a specific session instead.');
  }
  const f = await Feedback.create({ connection: conn._id, session: sessionId || undefined, from: req.user._id, to: conn.mentor, rating, comment: comment || '' });
  await recompute(conn.mentor);
  await notify(conn.mentor, 'feedback', 'New feedback received', `${req.user.name} rated you ${rating}/5.`, '/pages/feedback.html');
  res.status(201).json({ feedback: f });
});

exports.mine = wrap(async (req, res) => {
  const given = await Feedback.find({ from: req.user._id }).sort({ createdAt: -1 }).lean();
  const done = await Session.find({ mentee: req.user._id, status: 'completed' }).sort({ scheduledAt: -1 }).limit(50).lean();
  const rated = new Set(given.filter((g) => g.session).map((g) => String(g.session)));
  const conns = await MentorshipConnection.find({ mentee: req.user._id }).sort({ startedAt: -1 }).lean();
  const dir = await people([...conns.map((c) => c.mentor), ...given.map((g) => g.to)]);
  res.json({
    connections: conns.map((c) => ({ id: c._id, status: c.status, mentor: dir.get(String(c.mentor)) && { id: String(c.mentor), name: dir.get(String(c.mentor)).name } })),
    sessions: done.filter((s) => !rated.has(String(s._id))).map((s) => ({ id: s._id, connectionId: s.connection, title: s.title, scheduledAt: s.scheduledAt })),
    given: given.map((g) => ({ id: g._id, rating: g.rating, comment: g.comment, createdAt: g.createdAt, mentor: dir.get(String(g.to))?.name || 'Mentor' }))
  });
});

exports.received = wrap(async (req, res) => {
  const docs = await Feedback.find({ to: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  const dir = await people(docs.map((d) => d.from));
  const dist = [1, 2, 3, 4, 5].map((n) => ({ stars: n, count: docs.filter((d) => d.rating === n).length }));
  const avg = docs.length ? Math.round((docs.reduce((a, d) => a + d.rating, 0) / docs.length) * 10) / 10 : 0;
  res.json({ summary: { avg, count: docs.length, distribution: dist }, items: docs.map((d) => ({ id: d._id, rating: d.rating, comment: d.comment, createdAt: d.createdAt, from: dir.get(String(d.from))?.name || 'Student' })) });
});
