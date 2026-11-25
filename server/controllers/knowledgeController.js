const KnowledgeEntry = require('../models/KnowledgeEntry');
const Session = require('../models/Session');
const { wrap, fail, escapeRegex, str } = require('../utils/http');
const { people } = require('../services/directoryService');
const { notify } = require('../services/notifyService');

const CATS = ['technical', 'career', 'academics', 'research', 'soft-skills', 'other'];
const FIELDS = ['title', 'problem', 'solution', 'category', 'tags'];
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function shape(e, dir, me, full) {
  const a = dir.get(String(e.author));
  const out = {
    id: e._id, title: e.title, category: e.category, tags: e.tags, views: e.views, helpful: e.helpfulCount,
    createdAt: e.createdAt, updatedAt: e.updatedAt, mine: String(e.author) === String(me), sessionTitle: e.sessionTitle || '',
    author: a ? { id: a.id, name: a.name, role: a.role } : { name: 'Former member' }
  };
  if (full) { out.problem = e.problem; out.solution = e.solution; out.helpedByMe = (e.helpfulBy || []).some((x) => String(x) === String(me)); }
  else out.excerpt = cut(e.problem, 200);
  return out;
}

exports.list = wrap(async (req, res) => {
  const me = req.user._id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(24, parseInt(req.query.limit, 10) || 12);
  const f = {};
  const q = str(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q.slice(0, 60)), 'i'); f.$or = [{ title: rx }, { problem: rx }, { solution: rx }, { tags: rx }]; }
  if (CATS.includes(req.query.category)) f.category = req.query.category;
  if (str(req.query.tag)) f.tags = new RegExp(`^${escapeRegex(str(req.query.tag))}$`, 'i');
  if (req.query.mine === 'true') f.author = me;
  const sort = req.query.sort === 'helpful' ? { helpfulCount: -1, createdAt: -1 } : req.query.sort === 'views' ? { views: -1, createdAt: -1 } : { createdAt: -1 };
  const [docs, total] = await Promise.all([
    KnowledgeEntry.find(f).select('-helpfulBy -solution').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    KnowledgeEntry.countDocuments(f)
  ]);
  const dir = await people(docs.map((d) => d.author));
  res.json({ items: docs.map((d) => shape(d, dir, me, false)), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.tags = wrap(async (req, res) => {
  const rows = await KnowledgeEntry.aggregate([{ $unwind: '$tags' }, { $group: { _id: { $toLower: '$tags' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 15 }]);
  res.json({ items: rows.map((r) => ({ tag: r._id, count: r.n })) });
});

exports.getOne = wrap(async (req, res) => {
  const e = await KnowledgeEntry.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true, timestamps: false }).lean();
  if (!e) throw fail(404, 'Entry not found');
  const dir = await people([e.author]);
  res.json({ entry: shape(e, dir, req.user._id, true) });
});

exports.create = wrap(async (req, res) => {
  const data = { author: req.user._id };
  FIELDS.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
  if (req.body.sessionId) {
    const s = await Session.findOne({ _id: req.body.sessionId, status: 'completed', $or: [{ mentor: req.user._id }, { mentee: req.user._id }] });
    if (!s) throw fail(400, 'You can only link a completed session you took part in');
    data.session = s._id; data.sessionTitle = s.title;
  }
  const e = await KnowledgeEntry.create(data);
  res.status(201).json({ id: e._id });
});

exports.update = wrap(async (req, res) => {
  const e = await KnowledgeEntry.findOne({ _id: req.params.id, author: req.user._id });
  if (!e) throw fail(404, 'Entry not found');
  FIELDS.forEach((k) => { if (req.body[k] !== undefined) e[k] = req.body[k]; });
  await e.save();
  res.json({ message: 'Entry updated' });
});

exports.remove = wrap(async (req, res) => {
  const e = await KnowledgeEntry.findOneAndDelete({ _id: req.params.id, author: req.user._id });
  if (!e) throw fail(404, 'Entry not found');
  res.json({ message: 'Entry deleted' });
});

// Toggle "this helped me". Atomic filters make double-clicks and races safe.
exports.helpful = wrap(async (req, res) => {
  const me = req.user._id;
  const e = await KnowledgeEntry.findById(req.params.id).select('author helpfulBy title').lean();
  if (!e) throw fail(404, 'Entry not found');
  if (String(e.author) === String(me)) throw fail(400, 'You cannot mark your own entry as helpful');
  const has = e.helpfulBy.some((x) => String(x) === String(me));
  if (has) await KnowledgeEntry.updateOne({ _id: e._id, helpfulBy: me }, { $pull: { helpfulBy: me }, $inc: { helpfulCount: -1 } }, { timestamps: false });
  else {
    const r = await KnowledgeEntry.updateOne({ _id: e._id, helpfulBy: { $ne: me } }, { $addToSet: { helpfulBy: me }, $inc: { helpfulCount: 1 } }, { timestamps: false });
    if (r.modifiedCount) await notify(e.author, 'system', 'Your solution helped someone', `${req.user.name} found "${e.title}" helpful.`, '/pages/knowledge.html');
  }
  const fresh = await KnowledgeEntry.findById(e._id).select('helpfulCount').lean();
  res.json({ helpful: fresh.helpfulCount, helpedByMe: !has });
});
