const User = require('../models/User');
const MentorProfile = require('../models/MentorProfile');
const MenteeProfile = require('../models/MenteeProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const MentorshipConnection = require('../models/MentorshipConnection');
const Feedback = require('../models/Feedback');
const MatchFeedback = require('../models/MatchFeedback');
const { wrap, fail, escapeRegex, str } = require('../utils/http');
const { scoreMany } = require('../services/matchService');

const card = (p, match, relation) => ({
  id: String((p.user && p.user._id) || p.user), name: p.user && p.user.name, avatar: p.user && p.user.avatar,
  headline: p.headline, bio: p.bio, department: p.department, organization: p.organization,
  yearsExperience: p.yearsExperience, skills: p.skills, expertise: p.expertise, interests: p.interests,
  ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, isAcceptingMentees: p.isAcceptingMentees,
  match: match || null, relation: relation || 'none'
});

async function relationsFor(menteeId, mentorIds) {
  const [pending, active] = await Promise.all([
    MentorshipRequest.find({ mentee: menteeId, mentor: { $in: mentorIds }, status: 'pending' }).select('mentor').lean(),
    MentorshipConnection.find({ mentee: menteeId, mentor: { $in: mentorIds }, status: 'active' }).select('mentor').lean()
  ]);
  const map = new Map();
  pending.forEach((r) => map.set(String(r.mentor), 'pending'));
  active.forEach((c) => map.set(String(c.mentor), 'connected'));
  return map;
}

exports.list = wrap(async (req, res) => {
  const q = str(req.query.q);
  const sort = ['match', 'rating', 'experience', 'newest'].includes(req.query.sort) ? req.query.sort : 'match';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(24, parseInt(req.query.limit, 10) || 12);

  const f = { headline: { $ne: '' }, 'skills.0': { $exists: true } };
  if (req.query.available === 'true') f.isAcceptingMentees = true;
  const exact = (v) => new RegExp(`^${escapeRegex(v)}$`, 'i');
  if (str(req.query.department)) f.department = exact(str(req.query.department));
  if (str(req.query.expertise)) f.expertise = exact(str(req.query.expertise));
  if (Number(req.query.minRating) > 0) f.ratingAvg = { $gte: Number(req.query.minRating) };
  const skillList = str(req.query.skills).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
  if (skillList.length) f.skills = { $in: skillList.map(exact) };
  if (q) {
    const rx = new RegExp(escapeRegex(q.slice(0, 60)), 'i');
    const ids = (await User.find({ role: 'mentor', name: rx }).select('_id').lean()).map((u) => u._id);
    f.$or = [{ user: { $in: ids } }, { headline: rx }, { bio: rx }, { skills: rx }, { expertise: rx }, { organization: rx }];
  }

  const mentee = await MenteeProfile.findOne({ user: req.user._id }).lean();
  const total = await MentorProfile.countDocuments(f);
  let docs;
  if (sort === 'match') {
    docs = await MentorProfile.find(f).sort({ ratingAvg: -1, createdAt: -1 }).limit(300).populate('user', 'name avatar').lean();
  } else {
    const order = { rating: { ratingAvg: -1, ratingCount: -1 }, experience: { yearsExperience: -1 }, newest: { createdAt: -1 } }[sort];
    docs = await MentorProfile.find(f).sort(order).skip((page - 1) * limit).limit(limit).populate('user', 'name avatar').lean();
  }
  docs = docs.filter((d) => d.user);
  const scores = await scoreMany(mentee, docs);
  if (sort === 'match') {
    docs.sort((a, b) => ((scores && scores.get(String(b.user._id))?.score) ?? -1) - ((scores && scores.get(String(a.user._id))?.score) ?? -1));
    docs = docs.slice((page - 1) * limit, page * limit);
  }
  const rel = await relationsFor(req.user._id, docs.map((d) => d.user._id));
  const verdicts = new Map((await MatchFeedback.find({ mentee: req.user._id, raterRole: 'mentee', mentor: { $in: docs.map((d) => d.user._id) } }).select('mentor relevant').lean()).map((f) => [String(f.mentor), f.relevant]));
  const items = docs.map((d) => {
    const c = card(d, scores && scores.get(String(d.user._id)), rel.get(String(d.user._id)));
    c.myMatchFeedback = verdicts.has(String(d.user._id)) ? verdicts.get(String(d.user._id)) : null;
    c.bio = c.bio.length > 200 ? `${c.bio.slice(0, 197)}…` : c.bio;
    return c;
  });
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), matchingAvailable: !!scores });
});

exports.facets = wrap(async (req, res) => {
  const base = { headline: { $ne: '' } };
  const [expertise, departments] = await Promise.all([
    MentorProfile.distinct('expertise', base), MentorProfile.distinct('department', { ...base, department: { $ne: '' } })
  ]);
  const sorted = (a) => a.filter(Boolean).sort((x, y) => x.localeCompare(y));
  res.json({ expertise: sorted(expertise), departments: sorted(departments) });
});

exports.getOne = wrap(async (req, res) => {
  const p = await MentorProfile.findOne({ user: req.params.id }).populate('user', 'name avatar role').lean();
  if (!p || !p.user || p.user.role !== 'mentor') throw fail(404, 'Mentor not found');
  const mentorId = p.user._id;
  const [reviews, activeMentees] = await Promise.all([
    Feedback.find({ to: mentorId }).sort({ createdAt: -1 }).limit(10).populate('from', 'name').lean(),
    MentorshipConnection.countDocuments({ mentor: mentorId, status: 'active' })
  ]);
  let match = null; let relation = 'none'; let connectionId = null; let myMatchFeedback = null;
  if (req.user.role === 'mentee') {
    const mentee = await MenteeProfile.findOne({ user: req.user._id }).lean();
    const scores = await scoreMany(mentee, [p]);
    match = scores ? scores.get(String(mentorId)) : null;
    relation = (await relationsFor(req.user._id, [mentorId])).get(String(mentorId)) || 'none';
    const v = await MatchFeedback.findOne({ mentee: req.user._id, mentor: mentorId, raterRole: 'mentee' }).select('relevant').lean();
    myMatchFeedback = v ? v.relevant : null;
    if (relation === 'connected') connectionId = (await MentorshipConnection.findOne({ mentee: req.user._id, mentor: mentorId, status: 'active' }).select('_id').lean())._id;
  }
  res.json({
    mentor: { ...card(p, match, relation), availability: p.availability, maxMentees: p.maxMentees, activeMentees, spotsLeft: Math.max(0, p.maxMentees - activeMentees) },
    reviews: reviews.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, from: r.from ? r.from.name : 'Student' })),
    connectionId, myMatchFeedback
  });
});
