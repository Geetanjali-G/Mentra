const mongoose = require('mongoose');

const slot = new mongoose.Schema({
  day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], required: true },
  start: { type: String, required: true }, // "HH:mm"
  end: { type: String, required: true }
}, { _id: false });

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  headline: { type: String, default: '', maxlength: 120 },
  bio: { type: String, default: '', maxlength: 1500 },
  department: { type: String, default: '', maxlength: 80 },
  organization: { type: String, default: '', maxlength: 100 },
  yearsExperience: { type: Number, default: 0, min: 0 },
  skills: { type: [String], default: [], index: true },
  expertise: { type: [String], default: [], index: true },
  interests: { type: [String], default: [] },
  availability: { type: [slot], default: [] },
  maxMentees: { type: Number, default: 5, min: 1 },
  isAcceptingMentees: { type: Boolean, default: true },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('MentorProfile', schema);
