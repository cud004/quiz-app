const Exam = require('../models/Exam');
const QuizAttempt = require('../models/QuizAttempt');
const Topic = require('../models/Topic');

const suggestionService = {
  async getSuggestions(userId, { topicId, status, search }) {
    // 1. Lấy danh sách exam (có thể lọc theo topicId)
    const examFilter = {};
    if (topicId) examFilter.topic = topicId;
    const exams = await Exam.find(examFilter).populate('topic', 'name');
    
    // 2. Lấy lịch sử làm bài của user
    const attempts = await QuizAttempt.find({ user: userId, status: 'completed' });
    const attemptMap = {};
    attempts.forEach(a => {
      if (!attemptMap[a.exam]) attemptMap[a.exam] = [];
      attemptMap[a.exam].push(a);
    });

    // 3. Tính toán cho từng exam
    const examStats = exams.map(exam => {
      const examAttempts = attemptMap[exam._id] || [];
      let correct = 0, total = 0, lastAttempt = null;
      examAttempts.forEach(a => {
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
          status: 'needImprove',
          correct: 0,
          total,
          lastAttempt: null,
          description: exam.description,
          suggestion: 'Bạn chưa làm bài kiểm tra này. Hãy bắt đầu luyện tập để đánh giá kiến thức của mình.',
          practiceLink: `/practice/${exam._id}`
        };
      }
      const accuracy = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
      const examStatus = accuracy >= 80 ? 'mastered' : 'needImprove';
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
        suggestion: accuracy >= 80
          ? 'Bạn đã thành thạo chủ đề này. Hãy tiếp tục duy trì kiến thức bằng cách ôn tập định kỳ.'
          : (
              correct > 0
                ? `Bạn đã nắm được các kiến thức cơ bản. Hãy tập trung vào ${total - correct} câu hỏi còn lại để thành thạo chủ đề này.`
                : 'Bạn cần ôn tập lại kiến thức cơ bản về chủ đề này. Hãy bắt đầu với các bài học nền tảng.'
            )
      };
    });

    // 4. Lọc theo status, search
    let filtered = examStats;
    if (status && status !== 'all') filtered = filtered.filter(e => e.status === status);
    if (search) filtered = filtered.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

    // 5. Gom nhóm, đếm số lượng
    const masteredCount = examStats.filter(e => e.status === 'mastered').length;
    const needImproveCount = examStats.filter(e => e.status === 'needImprove').length;
    const totalExams = examStats.length;
    const progressPercent = totalExams > 0 ? Math.round((masteredCount / totalExams) * 1000) / 10 : 0;

    // 6. Lấy danh sách topic cho filter FE
    const topics = await Topic.find().select('_id name');

    return {
      masteredCount,
      needImproveCount,
      totalExams,
      progressPercent,
      exams: filtered,
      topics: topics.map(t => ({ id: t._id, name: t.name }))
    };
  }
};

module.exports = suggestionService; 