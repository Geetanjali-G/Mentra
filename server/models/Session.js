const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  connection: { type: ObjectId, ref: "MentorshipConnection", required: true, index: true },
  mentor: { type: ObjectId, ref: "User", required: true },
  mentee: { type: ObjectId, ref: "User", required: true },
  title: { type: String, required: true, maxlength: 120 },
  scheduledAt: { type: Date, required: true, index: true },
  durationMin: { type: Number, default: 30, min: 10, max: 240 },
  mode: { type: String, enum: ["online", "in-person"], default: "online" },
  meetingLink: { type: String, default: "" },
  agenda: { type: String, default: "" },
  notes: { type: String, default: "" },
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" }
}, { timestamps: true });

module.exports = mongoose.model("Session", schema);
