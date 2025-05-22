const PracticeSession = require("../models/PracticeSession");
const Question = require("../models/Question");
const UserAnswer = require("../models/UserAnswer");
const mongoose = require("mongoose");
const practiceController = {
  async startPracticeSession(req, res) {
    const { tagId, count } = req.body;
    const userId = req.user._id;

    // Get random questions with this tag
    const questions = await Question.aggregate([
      { $match: { tags: new mongoose.Types.ObjectId(tagId) } },
      { $sample: { size: Number(count) } },
    ]);

    const questionIds = questions.map((q) => q._id);

    // Create session
    const session = await PracticeSession.create({
      user: userId,
      tag: tagId,
      questions: questionIds,
      total: questionIds.length,
    });

    // Return questions (without answers)
    res.json({
      sessionId: session._id,
      questions: questions.map((q) => ({
        questionId: q._id,
        content: q.content,
        options: q.options,
      })),
    });
  },
  async submitAnswer(req, res) {
    const { sessionId, questionId, selectedAnswer } = req.body;
    const userId = req.user._id;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ error: "Question not found" });

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Save answer
    await UserAnswer.create({
      user: userId,
      question: questionId,
      tag: req.body.tagId || question.tags[0], // or all tags if needed
      isCorrect,
      selectedAnswer,
      attemptTime: new Date(),
      practiceSession: sessionId,
    });

    res.json({ success: true });
  },
  async completePracticeSession(req, res) {
    const { sessionId } = req.body;
    const userId = req.user._id;

    const session = await PracticeSession.findById(sessionId).populate(
      "questions"
    );
    if (!session || session.user.toString() !== userId.toString())
      return res.status(404).json({ error: "Session not found" });

    // Get all answers for this session
    const answers = await UserAnswer.find({
      user: userId,
      practiceSession: sessionId,
    });
    console.log(answers);
    // Map answers by questionId
    const answerMap = {};
    answers.forEach((a) => {
      answerMap[a.question.toString()] = a;
    });

    // Prepare summary
    let correctCount = 0;
    const details = session.questions.map((q) => {
      const userAns = answerMap[q._id.toString()];
      const isCorrect = userAns ? userAns.isCorrect : false;
      if (isCorrect) correctCount++;
      return {
        questionId: q._id,
        content: q.content,
        selectedAnswer: userAns ? userAns.selectedAnswer : null,
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      };
    });

    const score =
      session.questions.length > 0
        ? Math.round((correctCount / session.questions.length) * 100)
        : 0;

    // Update session
    session.status = "completed";
    session.endTime = new Date();
    session.score = score;
    session.correctCount = correctCount;
    await session.save();

    res.json({
      score,
      correctCount,
      total: session.questions.length,
      details,
    });
  },
};
module.exports = { practiceController };
