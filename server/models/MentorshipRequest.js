const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  mentee: { type: ObjectId, ref: "User", required: true, index: true },
  mentor: { type: ObjectId, ref: "User", required: true, index: true },
  message: { type: String, default: "", maxlength: 800 },
  status: { type: String, enum: ["pending", "accepted", "declined", "cancelled"], default: "pending" },
  matchScore: { type: Number, min: 0, max: 100 }, // computed by the matching service, never hardcoded
  respondedAt: Date
}, { timestamps: true });

// one open request per mentee/mentor pair
schema.index({ mentee: 1, mentor: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
module.exports = mongoose.model("MentorshipRequest", schema);
