const Exam = require("../models/Exam");
const QuizAttempt = require("../models/QuizAttempt");
const Topic = require("../models/Topic");
const UserAnswer = require("../models/UserAnswer");
const Tag = require("../models/Tag");
const Question = require("../models/Question");
const mongoose = require("mongoose");

const suggestionService = {
  async getSuggestions(userId, { topicId, status, search }) {
    // 1. Lấy danh sách exam (có thể lọc theo topicId)
    const examFilter = {};
    if (topicId) examFilter.topic = topicId;
    const exams = await Exam.find(examFilter).populate("topic", "name");

    // 2. Lấy lịch sử làm bài của user
    const attempts = await QuizAttempt.find({
      user: userId,
      status: "completed",
    });
    const attemptMap = {};
    attempts.forEach((a) => {
      if (!attemptMap[a.exam]) attemptMap[a.exam] = [];
      attemptMap[a.exam].push(a);
    });

    // 3. Tính toán cho từng exam
    const examStats = exams.map((exam) => {
      const examAttempts = attemptMap[exam._id] || [];
      let correct = 0,
        total = 0,
        lastAttempt = null;
      examAttempts.forEach((a) => {
        correct += a.correctAnswers || 0;
        total += a.totalQuestions || 0;
        if (!lastAttempt || a.endTime > lastAttempt) lastAttempt = a.endTime;
      });
      // Nếu user chưa làm bài nào với exam này
      if (examAttempts.length === 0) {
        total = exam.questionCount || 0;
        return {
          id: exam._id,
          name: exam.title,
          topic: { id: exam.topic._id, name: exam.topic.name },
          accuracy: 0,
          status: "needImprove",
          correct: 0,
          total,
          lastAttempt: null,
          description: exam.description,
          suggestion:
            "Bạn chưa làm bài kiểm tra này. Hãy bắt đầu luyện tập để đánh giá kiến thức của mình.",
          practiceLink: `/practice/${exam._id}`,
        };
      }
      const accuracy =
        total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
      const examStatus = accuracy >= 80 ? "mastered" : "needImprove";
      return {
        id: exam._id,
        name: exam.title,
        topic: { id: exam.topic._id, name: exam.topic.name },
        accuracy,
        status: examStatus,
        correct,
        total,
        lastAttempt,
        description: exam.description,
        suggestion:
          accuracy >= 80
            ? "Bạn đã thành thạo chủ đề này. Hãy tiếp tục duy trì kiến thức bằng cách ôn tập định kỳ."
            : correct > 0
            ? `Bạn đã nắm được các kiến thức cơ bản. Hãy tập trung vào ${
                total - correct
              } câu hỏi còn lại để thành thạo chủ đề này.`
            : "Bạn cần ôn tập lại kiến thức cơ bản về chủ đề này. Hãy bắt đầu với các bài học nền tảng.",
      };
    });

    // 4. Lọc theo status, search
    let filtered = examStats;
    if (status && status !== "all")
      filtered = filtered.filter((e) => e.status === status);
    if (search)
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
      );

    // 5. Gom nhóm, đếm số lượng
    const masteredCount = examStats.filter(
      (e) => e.status === "mastered"
    ).length;
    const needImproveCount = examStats.filter(
      (e) => e.status === "needImprove"
    ).length;
    const totalExams = examStats.length;
    const progressPercent =
      totalExams > 0 ? Math.round((masteredCount / totalExams) * 1000) / 10 : 0;

    // 6. Lấy danh sách topic cho filter FE
    const topics = await Topic.find().select("_id name");

    return {
      masteredCount,
      needImproveCount,
      totalExams,
      progressPercent,
      exams: filtered,
      topics: topics.map((t) => ({ id: t._id, name: t.name })),
    };
  },
  async getTagSuggestions(userId) {
    // 1. Lấy bản ghi trả lời mới nhất cho mỗi (user, question, tag)
    const latestAnswers = await UserAnswer.aggregate([
      { $match: { user: userId } },
      { $sort: { question: 1, tag: 1, attemptTime: -1 } },
      {
        $group: {
          _id: { question: "$question", tag: "$tag" },
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    // 2. Gom nhóm theo tag
    const tagStats = {};
    for (const ans of latestAnswers) {
      const tagId = ans.tag.toString();
      if (!tagStats[tagId])
        tagStats[tagId] = { correct: 0, total: 0, questionIds: new Set() };
      tagStats[tagId].total++;
      tagStats[tagId].questionIds.add(ans.question.toString());
      if (ans.isCorrect) tagStats[tagId].correct++;
    }

    // 3. Lấy thông tin tag, topic, tổng số câu hỏi của tag
    const tagIds = Object.keys(tagStats);
    const tags = await Tag.find({ _id: { $in: tagIds } }).populate(
      "topic",
      "name"
    );
    // Đếm tổng số câu hỏi của mỗi tag
    const tagQuestionCounts = {};
    if (tagIds.length > 0) {
      const counts = await Question.aggregate([
        {
          $match: {
            tags: { $in: tagIds.map((id) => new mongoose.Types.ObjectId(id)) },
          },
        },
        { $unwind: "$tags" },
        {
          $match: {
            tags: { $in: tagIds.map((id) => new mongoose.Types.ObjectId(id)) },
          },
        },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
      ]);
      counts.forEach((c) => {
        tagQuestionCounts[c._id.toString()] = c.count;
      });
    }

    // 4. Map kết quả trả về
    return tags.map((tag) => {
      const stat = tagStats[tag._id.toString()] || { correct: 0, total: 0 };
      const percent =
        stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      let status = "Bình thường";
      if (percent < 50) status = "Cần cải thiện";
      else if (percent >= 80) status = "Thành thạo";
      return {
        tagId: tag._id,
        tagName: tag.name,
        topicName: tag.topic?.name || "",
        correct: stat.correct,
        total: stat.total,
        percent,
        status,
        totalQuestionsInTag: tagQuestionCounts[tag._id.toString()] || 0,
      };
    });
  },
};

module.exports = { suggestionService };
