const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  college: { type: String, default: "" },
  department: { type: String, default: "" },
  year: { type: Number, min: 1, max: 6 },
  bio: { type: String, default: "", maxlength: 1000 },
  skills: { type: [String], default: [] },
  interests: { type: [String], default: [] },
  learningGoals: { type: String, default: "", maxlength: 1500 } // free text, used by AI matching
}, { timestamps: true });

module.exports = mongoose.model("MenteeProfile", schema);
