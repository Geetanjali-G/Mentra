const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  mentee: { type: ObjectId, ref: "User", required: true, index: true },
  mentor: { type: ObjectId, ref: "User", required: true, index: true },
  request: { type: ObjectId, ref: "MentorshipRequest" },
  status: { type: String, enum: ["active", "completed", "ended"], default: "active" },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date
}, { timestamps: true });

// only one active connection per mentee/mentor pair
schema.index({ mentee: 1, mentor: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

module.exports = mongoose.model("MentorshipConnection", schema);
