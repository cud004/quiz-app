const aiService = require('../services/aiService');
const Joi = require('joi');

// Validation schemas
const explainQuestionSchema = Joi.object({
  questionId: Joi.string().required(),
  userId: Joi.string().optional()
});

const suggestLearningPathSchema = Joi.object({
  userId: Joi.string().required()
});

const generateSmartExamSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  userId: Joi.string().required(),
  questionCount: Joi.number().integer().min(5).required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard', 'adaptive').required(),
  weaknessRatio: Joi.number().min(0).max(100).default(60),
  topics: Joi.array().items(Joi.string()).optional()
});

/**
 * Giải thích lý do sai cho một câu hỏi
 * @route POST /api/ai/explain
 */
exports.explainQuestion = async (req, res) => {
  try {
    const { error, value } = explainQuestionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { questionId, userId } = value;
    const explanation = await aiService.explainQuestion(questionId, userId);
    res.json(explanation);
  } catch (error) {
    res.status(400).json({ errorCode: 'EXPLANATION_ERROR', message: error.message });
  }
};

/**
 * Gợi ý lộ trình học tập thông minh cho người dùng
 * @route GET /api/ai/learning-path/:userId
 */
exports.suggestLearningPath = async (req, res) => {
  try {
    const { error, value } = suggestLearningPathSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const { userId } = value;
    const learningPath = await aiService.suggestLearningPath(userId);
    res.json(learningPath);
  } catch (error) {
    res.status(400).json({ errorCode: 'SUGGESTION_ERROR', message: error.message });
  }
};

/**
 * Tạo đề thi thông minh dựa trên mức độ, chủ đề và tỷ lệ điểm yếu
 * @route POST /api/ai/generate-exam
 */
exports.generateSmartExam = async (req, res) => {
  try {
    const { error, value } = generateSmartExamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });
    }

    const exam = await aiService.generateSmartExam(value);
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ errorCode: 'GENERATION_ERROR', message: error.message });
  }
};
