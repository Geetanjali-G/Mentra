const MatchFeedback = require('../models/MatchFeedback');
const MenteeProfile = require('../models/MenteeProfile');
const MentorProfile = require('../models/MentorProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const { wrap, fail } = require('../utils/http');
const { scoreOne } = require('../services/matchService');
const { people } = require('../services/directoryService');

// Mentees rate a mentor's match; mentors rate a student who sent them a request.
// The score is recomputed on the server so the stored value can be trusted.
exports.submit = wrap(async (req, res) => {
  const { otherId, relevant, comment } = req.body;
  const isMentor = req.user.role === 'mentor';
  const menteeId = isMentor ? otherId : req.user._id;
  const mentorId = isMentor ? req.user._id : otherId;
  if (isMentor && !(await MentorshipRequest.exists({ mentor: mentorId, mentee: menteeId }))) throw fail(403, 'You can only rate students who sent you a request');
  const [mentee, mentor] = await Promise.all([MenteeProfile.findOne({ user: menteeId }).lean(), MentorProfile.findOne({ user: mentorId }).lean()]);
  if (!mentee || !mentor) throw fail(404, 'Profile not found');
  const m = await scoreOne(mentee, mentor);
  await MatchFeedback.findOneAndUpdate(
    { mentee: menteeId, mentor: mentorId, raterRole: req.user.role },
    { relevant, comment: comment || '', score: m ? m.score : null, engine: m ? m.engine : 'none', reasons: m ? m.reasons : [] },
    { upsert: true, setDefaultsOnInsert: true }
  );
  res.status(201).json({ message: 'Feedback saved' });
});

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
const avg = (arr) => (arr.length ? Math.round((10 * arr.reduce((x, y) => x + y, 0)) / arr.length) / 10 : null);

exports.report = wrap(async (req, res) => {
  const docs = await MatchFeedback.find().sort({ createdAt: -1 }).limit(5000).lean();
  const scored = docs.filter((d) => d.score !== null && d.score !== undefined);
  const group = (key) => [...new Set(docs.map((d) => d[key]))].map((k) => {
    const s = docs.filter((d) => d[key] === k);
    return { name: k || 'none', n: s.length, precision: pct(s.filter((d) => d.relevant).length, s.length) };
  });
  const buckets = [['Low (0-34)', 0, 34], ['Medium (35-64)', 35, 64], ['High (65-100)', 65, 100]].map(([label, lo, hi]) => {
    const s = scored.filter((d) => d.score >= lo && d.score <= hi);
    return { label, n: s.length, relevantPct: pct(s.filter((d) => d.relevant).length, s.length) };
  });
  const dir = await people(docs.flatMap((d) => [d.mentee, d.mentor]));
  const view = (d) => ({ mentee: dir.get(String(d.mentee))?.name, mentor: dir.get(String(d.mentor))?.name, raterRole: d.raterRole, score: d.score, comment: d.comment, reasons: d.reasons });
  res.json({
    total: docs.length,
    raters: new Set(docs.map((d) => `${d.raterRole}:${d.raterRole === 'mentee' ? d.mentee : d.mentor}`)).size,
    precision: pct(docs.filter((d) => d.relevant).length, docs.length),
    avgScoreRelevant: avg(scored.filter((d) => d.relevant).map((d) => d.score)),
    avgScoreNotRelevant: avg(scored.filter((d) => !d.relevant).map((d) => d.score)),
    buckets, byRater: group('raterRole'), byEngine: group('engine'),
    falsePositives: docs.filter((d) => !d.relevant && d.score >= 65).slice(0, 10).map(view),
    falseNegatives: docs.filter((d) => d.relevant && d.score !== null && d.score < 35).slice(0, 10).map(view)
  });
});

const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // blocks spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

exports.exportCsv = wrap(async (req, res) => {
  const docs = await MatchFeedback.find().sort({ createdAt: -1 }).limit(5000).lean();
  const dir = await people(docs.flatMap((d) => [d.mentee, d.mentor]));
  const rows = [['date', 'rated_by', 'mentee', 'mentor', 'score', 'engine', 'relevant', 'shared_topics', 'comment']];
  docs.forEach((d) => rows.push([d.createdAt.toISOString(), d.raterRole, dir.get(String(d.mentee))?.name, dir.get(String(d.mentor))?.name, d.score, d.engine, d.relevant ? 'yes' : 'no', (d.reasons || []).join('; '), d.comment]));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mentra-alpha-match-feedback.csv"');
  res.send(rows.map((r) => r.map(cell).join(',')).join('\n'));
});
