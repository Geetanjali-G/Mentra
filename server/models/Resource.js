const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const schema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 140 },
  description: { type: String, default: "" },
  url: { type: String, required: true },
  type: { type: String, enum: ["article", "video", "course", "book", "tool", "other"], default: "article" },
  tags: { type: [String], default: [], index: true },
  author: { type: ObjectId, ref: "User", required: true },
  sharedWith: { type: ObjectId, ref: "User" } // optional: one mentee; empty = public library
}, { timestamps: true });

schema.index({ title: "text", description: "text", tags: "text" });
module.exports = mongoose.model("Resource", schema);
