const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const practiceSessionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tag: { type: Schema.Types.ObjectId, ref: "Tag", required: true },
  questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: {
    type: String,
    enum: ["in_progress", "completed"],
    default: "in_progress",
  },
  score: { type: Number }, // percent
  correctCount: { type: Number },
  total: { type: Number },
});

module.exports = mongoose.model("PracticeSession", practiceSessionSchema);
