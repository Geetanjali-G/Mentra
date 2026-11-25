const router = require('express').Router();
const { getMine, updateMine } = require('../controllers/profileController');
const { validate } = require('../middleware/validate');

const mentor = {
  name: { type: 'string', max: 80 },
  headline: { type: 'string', required: true, max: 120, label: 'Headline' },
  bio: { type: 'string', required: true, max: 1500, label: 'Bio' },
  department: { type: 'string', max: 80 }, organization: { type: 'string', max: 100 },
  yearsExperience: { type: 'number', min: 0, max: 60, integer: true, label: 'Years of experience' },
  skills: { type: 'array', required: true, max: 20, label: 'Skills' },
  expertise: { type: 'array', max: 10, label: 'Expertise areas' },
  interests: { type: 'array', max: 15 },
  maxMentees: { type: 'number', min: 1, max: 50, integer: true, label: 'Maximum mentees' },
  isAcceptingMentees: { type: 'boolean' },
  availability: { type: 'slots', label: 'Availability' }
};
const mentee = {
  name: { type: 'string', max: 80 },
  college: { type: 'string', max: 100 }, department: { type: 'string', max: 80 },
  year: { type: 'number', min: 1, max: 6, integer: true, label: 'Year' },
  bio: { type: 'string', max: 1000 },
  skills: { type: 'array', max: 20 },
  interests: { type: 'array', max: 15 },
  learningGoals: { type: 'string', required: true, max: 1500, label: 'Learning goals' }
};

router.get('/me', getMine);
router.put('/me', (req, res, next) => validate(req.user.role === 'mentor' ? mentor : mentee)(req, res, next), updateMine);
module.exports = router;
