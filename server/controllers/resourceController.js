const Resource = require('../models/Resource');
const MentorshipConnection = require('../models/MentorshipConnection');
const { wrap, fail, escapeRegex, str } = require('../utils/http');
const { people } = require('../services/directoryService');
const { notify } = require('../services/notifyService');

exports.list = wrap(async (req, res) => {
  const me = req.user._id;
  const and = [{ $or: [{ sharedWith: null }, { sharedWith: me }, { author: me }] }];
  const q = str(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q.slice(0, 60)), 'i'); and.push({ $or: [{ title: rx }, { description: rx }, { tags: rx }] }); }
  if (['article', 'video', 'course', 'book', 'tool', 'other'].includes(req.query.type)) and.push({ type: req.query.type });
  if (req.query.scope === 'mine') and.push({ author: me });
  if (req.query.scope === 'shared') and.push({ sharedWith: { $ne: null } });
  const docs = await Resource.find({ $and: and }).sort({ createdAt: -1 }).limit(100).lean();
  const dir = await people(docs.flatMap((r) => [r.author, r.sharedWith]));
  res.json({ items: docs.map((r) => ({ id: r._id, title: r.title, description: r.description, url: r.url, type: r.type, tags: r.tags, createdAt: r.createdAt, mine: String(r.author) === String(me), author: dir.get(String(r.author)) && { id: String(r.author), name: dir.get(String(r.author)).name }, sharedWith: r.sharedWith ? { id: String(r.sharedWith), name: dir.get(String(r.sharedWith))?.name } : null })) });
});

exports.create = wrap(async (req, res) => {
  const { sharedWith } = req.body;
  if (sharedWith && !(await MentorshipConnection.exists({ mentor: req.user._id, mentee: sharedWith, status: 'active' }))) throw fail(403, 'You can only share privately with your connected students');
  const { title, description, url, type, tags } = req.body;
  const r = await Resource.create({ title, description: description || '', url, type: type || 'article', tags: tags || [], author: req.user._id, sharedWith: sharedWith || undefined });
  if (sharedWith) await notify(sharedWith, 'system', 'New resource from your mentor', `${req.user.name} shared "${title}" with you.`, '/pages/resources.html');
  res.status(201).json({ resource: r });
});

exports.remove = wrap(async (req, res) => {
  const r = await Resource.findOneAndDelete({ _id: req.params.id, author: req.user._id });
  if (!r) throw fail(404, 'Resource not found');
  res.json({ message: 'Resource removed' });
});
