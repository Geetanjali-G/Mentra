const Session = require('../models/Session');
const MentorshipConnection = require('../models/MentorshipConnection');
const Feedback = require('../models/Feedback');
const { wrap, fail } = require('../utils/http');
const { people } = require('../services/directoryService');
const { notify } = require('../services/notifyService');

const FIELDS = ['title', 'durationMin', 'mode', 'meetingLink', 'agenda', 'notes'];

async function hasConflict(userIds, start, durationMin, excludeId) {
  const end = new Date(start.getTime() + durationMin * 60000);
  const q = { status: 'scheduled', $or: [{ mentor: { $in: userIds } }, { mentee: { $in: userIds } }], scheduledAt: { $lt: end, $gt: new Date(start.getTime() - 240 * 60000) } };
  if (excludeId) q._id = { $ne: excludeId };
  const near = await Session.find(q).select('scheduledAt durationMin').lean();
  return near.some((s) => s.scheduledAt < end && new Date(s.scheduledAt.getTime() + s.durationMin * 60000) > start);
}

exports.create = wrap(async (req, res) => {
  const { connectionId, scheduledAt } = req.body;
  const conn = await MentorshipConnection.findOne({ _id: connectionId, status: 'active', $or: [{ mentor: req.user._id }, { mentee: req.user._id }] });
  if (!conn) throw fail(404, 'No active mentorship found for this session');
  if (scheduledAt <= new Date()) throw fail(400, 'Pick a time in the future');
  const duration = req.body.durationMin || 30;
  if (await hasConflict([conn.mentor, conn.mentee], scheduledAt, duration)) throw fail(409, 'One of you already has a session at that time');
  const s = await Session.create({ connection: conn._id, mentor: conn.mentor, mentee: conn.mentee, title: req.body.title, scheduledAt, durationMin: duration, mode: req.body.mode || 'online', meetingLink: req.body.meetingLink || '', agenda: req.body.agenda || '' });
  const other = String(conn.mentor) === String(req.user._id) ? conn.mentee : conn.mentor;
  await notify(other, 'session', 'New session scheduled', `${req.user.name} scheduled "${s.title}" for ${scheduledAt.toUTCString()}.`, '/pages/sessions.html');
  res.status(201).json({ session: s });
});

exports.list = wrap(async (req, res) => {
  const isMentor = req.user.role === 'mentor';
  const f = { [isMentor ? 'mentor' : 'mentee']: req.user._id };
  const now = new Date(); const when = req.query.when || 'upcoming';
  let sort = { scheduledAt: -1 };
  if (when === 'upcoming') { f.status = 'scheduled'; f.scheduledAt = { $gte: now }; sort = { scheduledAt: 1 }; }
  else if (when === 'past') f.$or = [{ status: 'completed' }, { status: 'scheduled', scheduledAt: { $lt: now } }];
  else if (when === 'cancelled') f.status = 'cancelled';
  const docs = await Session.find(f).sort(sort).limit(100).lean();
  const dir = await people(docs.map((s) => (isMentor ? s.mentee : s.mentor)));
  let rated = new Set();
  if (!isMentor && docs.length) rated = new Set((await Feedback.find({ from: req.user._id, session: { $in: docs.map((d) => d._id) } }).select('session').lean()).map((x) => String(x.session)));
  res.json({ items: docs.map((s) => ({ id: s._id, connectionId: s.connection, title: s.title, scheduledAt: s.scheduledAt, durationMin: s.durationMin, mode: s.mode, meetingLink: s.meetingLink, agenda: s.agenda, notes: s.notes, status: s.status, rated: rated.has(String(s._id)), person: dir.get(String(isMentor ? s.mentee : s.mentor)) })) });
});

exports.update = wrap(async (req, res) => {
  const s = await Session.findOne({ _id: req.params.id, $or: [{ mentor: req.user._id }, { mentee: req.user._id }] });
  if (!s) throw fail(404, 'Session not found');
  const isMentor = String(s.mentor) === String(req.user._id);
  const other = isMentor ? s.mentee : s.mentor;
  const { status, scheduledAt } = req.body;
  const open = s.status === 'scheduled';

  if (status === 'completed') {
    if (!isMentor) throw fail(403, 'Only the mentor can mark a session as completed');
    if (!open) throw fail(409, 'This session is already closed');
    s.status = 'completed';
    await notify(other, 'feedback', 'Session completed', `How was "${s.title}"? Share your feedback.`, `/pages/feedback.html?connection=${s.connection}&session=${s._id}`);
  } else if (status === 'cancelled') {
    if (!open) throw fail(409, 'This session is already closed');
    s.status = 'cancelled';
    await notify(other, 'session', 'Session cancelled', `${req.user.name} cancelled "${s.title}".`, '/pages/sessions.html');
  } else if (scheduledAt) {
    if (!open) throw fail(409, 'Only scheduled sessions can be rescheduled');
    if (scheduledAt <= new Date()) throw fail(400, 'Pick a time in the future');
    const dur = req.body.durationMin || s.durationMin;
    if (await hasConflict([s.mentor, s.mentee], scheduledAt, dur, s._id)) throw fail(409, 'One of you already has a session at that time');
    s.scheduledAt = scheduledAt;
    await notify(other, 'session', 'Session rescheduled', `${req.user.name} moved "${s.title}" to ${scheduledAt.toUTCString()}.`, '/pages/sessions.html');
  }
  for (const k of FIELDS) if (req.body[k] !== undefined && (open || k === 'notes')) s[k] = req.body[k];
  await s.save();
  res.json({ session: s });
});
