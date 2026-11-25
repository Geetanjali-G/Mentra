const router = require('express').Router();
const { protect, requireRole, requireAlpha } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const dash = require('../controllers/dashboardController');
const mentors = require('../controllers/mentorController');
const requests = require('../controllers/requestController');
const connections = require('../controllers/connectionController');
const sessions = require('../controllers/sessionController');
const goals = require('../controllers/goalController');
const resources = require('../controllers/resourceController');
const feedback = require('../controllers/feedbackController');
const notifications = require('../controllers/notificationController');
const knowledge = require('../controllers/knowledgeController');
const matchFb = require('../controllers/matchFeedbackController');

const mentee = requireRole('mentee');
const mentor = requireRole('mentor');

router.get('/health', (req, res) => res.json({ status: 'ok', app: 'MENTRA' }));
router.get('/public/stats', dash.publicStats);
router.use('/auth', require('./authRoutes'));

// everything below requires a logged-in user
router.use(protect);
router.use('/profiles', require('./profileRoutes'));
router.get('/dashboard', dash.summary);

router.get('/mentors', mentee, mentors.list);
router.get('/mentors/facets', mentors.facets);
router.get('/mentors/:id', mentors.getOne);

router.post('/requests', mentee, validate({ mentorId: { type: 'objectId', required: true }, message: { type: 'string', max: 800 } }), requests.create);
router.get('/requests', requests.list);
router.patch('/requests/:id/respond', mentor, validate({ action: { type: 'enum', required: true, values: ['accept', 'decline'] } }), requests.respond);
router.patch('/requests/:id/cancel', mentee, requests.cancel);

router.get('/connections', connections.list);
router.patch('/connections/:id/end', connections.end);

const sessionFields = {
  title: { type: 'string', max: 120 }, scheduledAt: { type: 'date', label: 'Date and time' },
  durationMin: { type: 'number', min: 10, max: 240, integer: true }, mode: { type: 'enum', values: ['online', 'in-person'] },
  meetingLink: { type: 'url', label: 'Meeting link' }, agenda: { type: 'string', max: 500 }, notes: { type: 'string', max: 2000 }
};
router.post('/sessions', validate({ ...sessionFields, connectionId: { type: 'objectId', required: true }, title: { type: 'string', required: true, max: 120, label: 'Title' }, scheduledAt: { type: 'date', required: true, label: 'Date and time' } }), sessions.create);
router.get('/sessions', sessions.list);
router.patch('/sessions/:id', validate({ ...sessionFields, status: { type: 'enum', values: ['completed', 'cancelled'] } }), sessions.update);

const goalFields = { title: { type: 'string', max: 140 }, description: { type: 'string', max: 800 }, category: { type: 'string', max: 40 }, targetDate: { type: 'date' } };
router.post('/goals', mentee, validate({ ...goalFields, title: { type: 'string', required: true, max: 140, label: 'Title' } }), goals.create);
router.get('/goals', goals.list);
router.put('/goals/:id', mentee, validate(goalFields), goals.update);
router.delete('/goals/:id', mentee, goals.remove);
router.get('/goals/:id/progress', goals.history);
router.post('/goals/:id/progress', validate({ percent: { type: 'number', min: 0, max: 100, integer: true, label: 'Progress' }, note: { type: 'string', max: 500 } }), goals.addProgress);

router.get('/resources', resources.list);
router.post('/resources', mentor, validate({
  title: { type: 'string', required: true, max: 140, label: 'Title' }, description: { type: 'string', max: 600 },
  url: { type: 'url', required: true, label: 'Link' }, type: { type: 'enum', values: ['article', 'video', 'course', 'book', 'tool', 'other'] },
  tags: { type: 'array', max: 8 }, sharedWith: { type: 'objectId' }
}), resources.create);
router.delete('/resources/:id', mentor, resources.remove);

router.post('/feedback', mentee, validate({ connectionId: { type: 'objectId', required: true }, sessionId: { type: 'objectId' }, rating: { type: 'number', required: true, min: 1, max: 5, integer: true, label: 'Rating' }, comment: { type: 'string', max: 1000 } }), feedback.create);
router.get('/feedback/mine', mentee, feedback.mine);
router.get('/feedback/received', mentor, feedback.received);

const kb = {
  title: { type: 'string', max: 140, label: 'Title' }, problem: { type: 'string', max: 2000, label: 'Problem' }, solution: { type: 'string', max: 5000, label: 'Solution' },
  category: { type: 'enum', values: ['technical', 'career', 'academics', 'research', 'soft-skills', 'other'] }, tags: { type: 'array', max: 8 }
};
router.get('/knowledge', knowledge.list);
router.get('/knowledge/tags', knowledge.tags);
router.get('/knowledge/:id', knowledge.getOne);
router.post('/knowledge', validate({ ...kb, title: { ...kb.title, required: true }, problem: { ...kb.problem, required: true }, solution: { ...kb.solution, required: true }, sessionId: { type: 'objectId' } }), knowledge.create);
router.put('/knowledge/:id', validate(kb), knowledge.update);
router.delete('/knowledge/:id', knowledge.remove);
router.post('/knowledge/:id/helpful', knowledge.helpful);

router.post('/match-feedback', validate({ otherId: { type: 'objectId', required: true }, relevant: { type: 'boolean', required: true }, comment: { type: 'string', max: 500 } }), matchFb.submit);
router.get('/alpha/report', requireAlpha, matchFb.report);
router.get('/alpha/export.csv', requireAlpha, matchFb.exportCsv);

router.get('/notifications', notifications.list);
router.get('/notifications/unread-count', notifications.unreadCount);
router.patch('/notifications/read-all', notifications.markAllRead);
router.patch('/notifications/:id/read', notifications.markRead);

module.exports = router;
