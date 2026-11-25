const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  goal: { type: ObjectId, ref: "Goal", required: true, index: true },
  author: { type: ObjectId, ref: "User", required: true },
  percent: { type: Number, min: 0, max: 100, required: true },
  byRole: { type: String, enum: ['mentee', 'mentor'], default: 'mentee' },
  note: { type: String, default: "", maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model("Progress", schema);
