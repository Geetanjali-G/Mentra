const User = require('../models/User');
const MentorProfile = require('../models/MentorProfile');
const MenteeProfile = require('../models/MenteeProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const MentorshipConnection = require('../models/MentorshipConnection');
const { wrap, fail } = require('../utils/http');
const { scoreOne } = require('../services/matchService');
const { isComplete } = require('../services/profileService');
const { notify } = require('../services/notifyService');
const { people } = require('../services/directoryService');
const MatchFeedback = require('../models/MatchFeedback');

exports.create = wrap(async (req, res) => {
  const { mentorId, message } = req.body;
  const mentor = await User.findOne({ _id: mentorId, role: 'mentor', isActive: true });
  if (!mentor) throw fail(404, 'Mentor not found');
  const mp = await MentorProfile.findOne({ user: mentor._id }).lean();
  if (!mp || !mp.isAcceptingMentees) throw fail(409, 'This mentor is not accepting new mentees right now');
  if (await MentorshipConnection.exists({ mentee: req.user._id, mentor: mentor._id, status: 'active' })) throw fail(409, 'You are already connected with this mentor');
  const mentee = await MenteeProfile.findOne({ user: req.user._id }).lean();
  if (!isComplete('mentee', mentee)) throw fail(400, 'Complete your profile before sending requests');
  const match = await scoreOne(mentee, mp);
  let doc;
  try { doc = await MentorshipRequest.create({ mentee: req.user._id, mentor: mentor._id, message: message || '', matchScore: match ? match.score : undefined }); }
  catch (e) { if (e.code === 11000) throw fail(409, 'You already have a pending request to this mentor'); throw e; }
  await notify(mentor._id, 'request', 'New mentorship request', `${req.user.name} would like you to mentor them.`, '/pages/requests.html');
  res.status(201).json({ request: doc });
});

exports.list = wrap(async (req, res) => {
  const isMentor = req.user.role === 'mentor';
  const f = isMentor ? { mentor: req.user._id } : { mentee: req.user._id };
  if (['pending', 'accepted', 'declined', 'cancelled'].includes(req.query.status)) f.status = req.query.status;
  const docs = await MentorshipRequest.find(f).sort({ createdAt: -1 }).limit(100).lean();
  const dir = await people(docs.map((r) => (isMentor ? r.mentee : r.mentor)));
  const verdicts = isMentor ? new Map((await MatchFeedback.find({ mentor: req.user._id, raterRole: 'mentor', mentee: { $in: docs.map((r) => r.mentee) } }).select('mentee relevant').lean()).map((f) => [String(f.mentee), f.relevant])) : new Map();
  res.json({ items: docs.map((r) => ({ id: r._id, myMatchFeedback: verdicts.has(String(r.mentee)) ? verdicts.get(String(r.mentee)) : null, status: r.status, message: r.message, matchScore: r.matchScore ?? null, createdAt: r.createdAt, respondedAt: r.respondedAt, person: dir.get(String(isMentor ? r.mentee : r.mentor)) })) });
});

exports.respond = wrap(async (req, res) => {
  const r = await MentorshipRequest.findOne({ _id: req.params.id, mentor: req.user._id });
  if (!r) throw fail(404, 'Request not found');
  if (r.status !== 'pending') throw fail(409, `This request was already ${r.status}`);
  const accept = req.body.action === 'accept';
  if (accept) {
    const mp = await MentorProfile.findOne({ user: req.user._id }).lean();
    const active = await MentorshipConnection.countDocuments({ mentor: req.user._id, status: 'active' });
    if (mp && active >= mp.maxMentees) throw fail(409, 'You have reached your maximum number of mentees. Raise the limit in your profile first.');
    try { await MentorshipConnection.create({ mentee: r.mentee, mentor: r.mentor, request: r._id }); }
    catch (e) { if (e.code !== 11000) throw e; }
  }
  r.status = accept ? 'accepted' : 'declined';
  r.respondedAt = new Date();
  await r.save();
  await notify(r.mentee, accept ? 'request-accepted' : 'request-declined',
    accept ? 'Mentorship request accepted' : 'Mentorship request declined',
    accept ? `${req.user.name} accepted your request. You can now schedule a session.` : `${req.user.name} is unable to take on a new mentee right now.`,
    accept ? '/pages/connections.html' : '/pages/discover.html');
  res.json({ message: accept ? 'Request accepted' : 'Request declined', status: r.status });
});

exports.cancel = wrap(async (req, res) => {
  const r = await MentorshipRequest.findOne({ _id: req.params.id, mentee: req.user._id });
  if (!r) throw fail(404, 'Request not found');
  if (r.status !== 'pending') throw fail(409, 'Only pending requests can be cancelled');
  r.status = 'cancelled'; await r.save();
  res.json({ message: 'Request cancelled' });
});
