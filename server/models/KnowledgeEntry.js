const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// A reusable problem + solution pair, optionally tied to the mentoring session it came from.
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  problem: { type: String, required: true, maxlength: 2000 },
  solution: { type: String, required: true, maxlength: 5000 },
  category: { type: String, enum: ['technical', 'career', 'academics', 'research', 'soft-skills', 'other'], default: 'technical', index: true },
  tags: { type: [String], default: [], index: true },
  author: { type: ObjectId, ref: 'User', required: true, index: true },
  session: { type: ObjectId, ref: 'Session' },
  sessionTitle: { type: String, default: '' },
  helpfulBy: { type: [ObjectId], default: [] },
  helpfulCount: { type: Number, default: 0, index: true },
  views: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeEntry', schema);
