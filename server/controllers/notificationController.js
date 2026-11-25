const Notification = require('../models/Notification');
const { wrap, fail } = require('../utils/http');

exports.list = wrap(async (req, res) => {
  const f = { user: req.user._id };
  if (req.query.unread === 'true') f.read = false;
  const [items, unread] = await Promise.all([
    Notification.find(f).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);
  res.json({ items, unread });
});

exports.unreadCount = wrap(async (req, res) => res.json({ unread: await Notification.countDocuments({ user: req.user._id, read: false }) }));

exports.markRead = wrap(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true });
  if (!n) throw fail(404, 'Notification not found');
  res.json({ message: 'Marked as read' });
});

exports.markAllRead = wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});
