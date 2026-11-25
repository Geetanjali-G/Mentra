const MentorshipConnection = require('../models/MentorshipConnection');
const Session = require('../models/Session');
const { wrap, fail } = require('../utils/http');
const { people } = require('../services/directoryService');
const { notify } = require('../services/notifyService');

exports.list = wrap(async (req, res) => {
  const isMentor = req.user.role === 'mentor';
  const f = { [isMentor ? 'mentor' : 'mentee']: req.user._id };
  f.status = req.query.status === 'ended' ? { $in: ['ended', 'completed'] } : 'active';
  const docs = await MentorshipConnection.find(f).sort({ startedAt: -1 }).lean();
  const dir = await people(docs.map((c) => (isMentor ? c.mentee : c.mentor)));
  const upcoming = await Session.find({ connection: { $in: docs.map((d) => d._id) }, status: 'scheduled', scheduledAt: { $gte: new Date() } }).sort({ scheduledAt: 1 }).lean();
  const next = new Map();
  upcoming.forEach((s) => { if (!next.has(String(s.connection))) next.set(String(s.connection), { id: s._id, title: s.title, scheduledAt: s.scheduledAt }); });
  res.json({ items: docs.map((c) => ({ id: c._id, status: c.status, startedAt: c.startedAt, endedAt: c.endedAt, person: dir.get(String(isMentor ? c.mentee : c.mentor)), nextSession: next.get(String(c._id)) || null })) });
});

exports.end = wrap(async (req, res) => {
  const c = await MentorshipConnection.findOne({ _id: req.params.id, $or: [{ mentor: req.user._id }, { mentee: req.user._id }] });
  if (!c) throw fail(404, 'Connection not found');
  if (c.status !== 'active') throw fail(409, 'This mentorship has already ended');
  c.status = 'ended'; c.endedAt = new Date(); await c.save();
  await Session.updateMany({ connection: c._id, status: 'scheduled', scheduledAt: { $gte: new Date() } }, { status: 'cancelled' });
  const other = String(c.mentor) === String(req.user._id) ? c.mentee : c.mentor;
  await notify(other, 'system', 'Mentorship ended', `${req.user.name} ended the mentorship. Upcoming sessions were cancelled.`, '/pages/connections.html');
  res.json({ message: 'Mentorship ended' });
});
