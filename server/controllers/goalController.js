const Goal = require('../models/Goal');
const Progress = require('../models/Progress');
const MentorshipConnection = require('../models/MentorshipConnection');
const { wrap, fail } = require('../utils/http');
const { notify } = require('../services/notifyService');

const FIELDS = ['title', 'description', 'category', 'targetDate'];
const statusFor = (p) => (p >= 100 ? 'completed' : p > 0 ? 'in-progress' : 'not-started');
const mentorCan = (mentorId, menteeId) => MentorshipConnection.exists({ mentor: mentorId, mentee: menteeId, status: 'active' });

async function loadForViewer(req) {
  const g = await Goal.findById(req.params.id);
  if (!g) throw fail(404, 'Goal not found');
  const own = String(g.mentee) === String(req.user._id);
  if (!own && !(req.user.role === 'mentor' && await mentorCan(req.user._id, g.mentee))) throw fail(404, 'Goal not found');
  return { g, own };
}

exports.create = wrap(async (req, res) => {
  const g = await Goal.create({ mentee: req.user._id, ...Object.fromEntries(FIELDS.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]])) });
  res.status(201).json({ goal: g });
});

exports.list = wrap(async (req, res) => {
  let menteeId = req.user._id;
  if (req.user.role === 'mentor') {
    if (!req.query.menteeId) throw fail(400, 'Choose a student to view their goals');
    if (!(await mentorCan(req.user._id, req.query.menteeId))) throw fail(403, 'You can only view goals of your connected students');
    menteeId = req.query.menteeId;
  }
  res.json({ items: await Goal.find({ mentee: menteeId }).sort({ status: 1, targetDate: 1, createdAt: -1 }).lean() });
});

exports.update = wrap(async (req, res) => {
  const g = await Goal.findOne({ _id: req.params.id, mentee: req.user._id });
  if (!g) throw fail(404, 'Goal not found');
  for (const k of FIELDS) if (req.body[k] !== undefined) g[k] = req.body[k];
  await g.save();
  res.json({ goal: g });
});

exports.remove = wrap(async (req, res) => {
  const g = await Goal.findOneAndDelete({ _id: req.params.id, mentee: req.user._id });
  if (!g) throw fail(404, 'Goal not found');
  await Progress.deleteMany({ goal: g._id });
  res.json({ message: 'Goal deleted' });
});

exports.history = wrap(async (req, res) => {
  const { g } = await loadForViewer(req);
  res.json({ items: await Progress.find({ goal: g._id }).sort({ createdAt: -1 }).limit(50).lean() });
});

exports.addProgress = wrap(async (req, res) => {
  const { g, own } = await loadForViewer(req);
  if (own) {
    if (req.body.percent === undefined) throw fail(400, 'Progress percentage is required');
    g.progress = req.body.percent; g.status = statusFor(g.progress); await g.save();
    await Progress.create({ goal: g._id, author: req.user._id, byRole: 'mentee', percent: g.progress, note: req.body.note || '' });
    const mentors = await MentorshipConnection.find({ mentee: req.user._id, status: 'active' }).select('mentor').lean();
    await Promise.all(mentors.map((m) => notify(m.mentor, 'goal', g.status === 'completed' ? 'Goal completed' : 'Goal progress updated', `${req.user.name} is at ${g.progress}% on "${g.title}".`, `/pages/goals.html?mentee=${req.user._id}`)));
  } else {
    if (!req.body.note) throw fail(400, 'Write a note for your student');
    await Progress.create({ goal: g._id, author: req.user._id, byRole: 'mentor', percent: g.progress, note: req.body.note });
    await notify(g.mentee, 'goal', 'Mentor note on your goal', `${req.user.name} commented on "${g.title}".`, '/pages/goals.html');
  }
  res.status(201).json({ goal: g });
});
