const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// One verdict per (mentee, mentor, who rated). Stores the score at the time so accuracy can be analysed later.
const schema = new mongoose.Schema({
  mentee: { type: ObjectId, ref: 'User', required: true, index: true },
  mentor: { type: ObjectId, ref: 'User', required: true, index: true },
  raterRole: { type: String, enum: ['mentee', 'mentor'], required: true },
  relevant: { type: Boolean, required: true },
  comment: { type: String, default: '', maxlength: 500 },
  score: { type: Number, default: null },
  engine: { type: String, default: 'none' },
  reasons: { type: [String], default: [] }
}, { timestamps: true });

schema.index({ mentee: 1, mentor: 1, raterRole: 1 }, { unique: true });
module.exports = mongoose.model('MatchFeedback', schema);
