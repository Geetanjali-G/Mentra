const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  mentee: { type: ObjectId, ref: "User", required: true, index: true },
  connection: { type: ObjectId, ref: "MentorshipConnection" },
  title: { type: String, required: true, maxlength: 140 },
  description: { type: String, default: "" },
  category: { type: String, default: "general" },
  targetDate: Date,
  progress: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ["not-started", "in-progress", "completed"], default: "not-started" }
}, { timestamps: true });

module.exports = mongoose.model("Goal", schema);
