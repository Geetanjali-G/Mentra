const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  session: { type: ObjectId, ref: "Session" },
  connection: { type: ObjectId, ref: "MentorshipConnection", required: true },
  from: { type: ObjectId, ref: "User", required: true },
  to: { type: ObjectId, ref: "User", required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "", maxlength: 1000 }
}, { timestamps: true });

schema.index({ session: 1, from: 1 }, { unique: true, partialFilterExpression: { session: { $type: "objectId" } } });
module.exports = mongoose.model("Feedback", schema);
