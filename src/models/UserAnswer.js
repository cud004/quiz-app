const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userAnswerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
  tag: { type: Schema.Types.ObjectId, ref: "Tag", required: true },
  isCorrect: { type: Boolean, required: true },
  attemptTime: { type: Date, default: Date.now },
  quizAttempt: { type: Schema.Types.ObjectId, ref: "QuizAttempt" }, // optional
  practiceSession: { type: Schema.Types.ObjectId, ref: "PracticeSession" }, // new
});

userAnswerSchema.index({ user: 1, question: 1, attemptTime: -1 });

module.exports = mongoose.model("UserAnswer", userAnswerSchema);
