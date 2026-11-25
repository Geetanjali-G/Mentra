const Notification = require('../models/Notification');

exports.notify = (user, type, title, message = '', link = '') =>
  Notification.create({ user, type, title, message, link }).catch((e) => console.error('notify failed:', e.message));
