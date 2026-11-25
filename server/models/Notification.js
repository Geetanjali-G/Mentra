const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["request", "request-accepted", "request-declined", "session", "feedback", "goal", "system"], default: "system" },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  link: { type: String, default: "" },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Notification", schema);
