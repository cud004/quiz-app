const Joi = require('joi');
const questionService = require('../services/questionService');

const questionSchema = Joi.object({
    content: Joi.string().required(), // Đổi từ questionText thành content
    options: Joi.array().items(
        Joi.object({
            text: Joi.string().required(),
            isCorrect: Joi.boolean().required()
        })
    ).min(2).required(),
    topic: Joi.string().required(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    explanation: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
});

const bulkQuestionSchema = Joi.array().items(questionSchema).min(1);

const updateQuestionSchema = Joi.object({
    content: Joi.string().optional(), // Đổi từ questionText thành content
    options: Joi.array().items(
        Joi.object({
            text: Joi.string().required(),
            isCorrect: Joi.boolean().required()
        })
    ).min(2).optional(),
    topic: Joi.string().optional(),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
    explanation: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
});

exports.createQuestion = async (req, res) => {
    const { error } = questionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const question = await questionService.createQuestion(req.body);
        res.status(201).json(question);
    } catch (error) {
        if (error.errorCode === 'QUESTION_CONTENT_EXISTS' || error.errorCode === 'INVALID_TOPIC') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

exports.createManyQuestions = async (req, res) => {
    const { error } = bulkQuestionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const questions = await questionService.createManyQuestions(req.body);
        res.status(201).json(questions);
    } catch (error) {
        if (
            error.errorCode === 'QUESTION_CONTENT_EXISTS' ||
            error.errorCode === 'INVALID_TOPIC' ||
            error.errorCode === 'DUPLICATE_QUESTIONS_IN_REQUEST'
        ) {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

exports.getQuestions = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        topic: req.query.topic,
        difficulty: req.query.difficulty,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
    };

    try {
        const questions = await questionService.getQuestions(page, limit, filters);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

exports.getQuestionById = async (req, res) => {
    try {
        const question = await questionService.getQuestionById(req.params.id);
        res.json(question);
    } catch (error) {
        if (error.errorCode === 'INVALID_ID') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        if (error.errorCode === 'QUESTION_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

exports.updateQuestion = async (req, res) => {
    const { error } = updateQuestionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const question = await questionService.updateQuestion(req.params.id, req.body);
        res.json(question);
    } catch (error) {
        if (error.errorCode === 'INVALID_ID' || error.errorCode === 'INVALID_TOPIC') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        if (error.errorCode === 'QUESTION_CONTENT_EXISTS') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        if (error.errorCode === 'QUESTION_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const result = await questionService.deleteQuestion(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.errorCode === 'INVALID_ID') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        if (error.errorCode === 'QUESTION_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};
exports.deleteManyQuestions = async (req, res) => {
    const { ids } = req.body; // Lấy danh sách ID từ body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ errorCode: 'INVALID_IDS', message: 'No question IDs provided' });
    }
  
    try {
      const result = await questionService.deleteManyQuestions(ids);
      res.json(result);
    } catch (error) {
      if (error.errorCode === 'INVALID_IDS') {
        return res.status(400).json({ errorCode: error.errorCode, message: error.message });
      }
      if (error.errorCode === 'QUESTIONS_NOT_FOUND') {
        return res.status(404).json({ errorCode: error.errorCode, message: error.message });
      }
      res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
  };