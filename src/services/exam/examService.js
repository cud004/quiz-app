class ExamService {
  static validateQuestions(questions) {
    if (!questions || questions.length < 1) {
      throw new Error('Exam must have at least one question');
    }
    return true;
  }

  static calculateStats(attempts) {
    if (!attempts || attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        completionRate: 0
      };
    }

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(attempt => attempt.completed).length;
    const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);

    return {
      totalAttempts,
      averageScore: totalScore / totalAttempts,
      completionRate: (completedAttempts / totalAttempts) * 100
    };
  }

  static updateExamStats(exam) {
    const QuizAttempt = require('../../models/QuizAttempt');
    return QuizAttempt.find({ exam: exam._id })
      .then(attempts => {
        const stats = this.calculateStats(attempts);
        exam.stats = stats;
        return exam.save();
      });
  }
}

module.exports = ExamService; 