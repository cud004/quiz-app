const Joi = require('joi');
const examService = require('../services/examService');

// Validation schemas
const createExamSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    questionIds: Joi.array().items(Joi.string()).min(1).required(),
    examType: Joi.string().valid('practice', 'midterm', 'final', 'custom').optional(),
    recommendedFor: Joi.array().items(Joi.string()).optional(),
    timeLimit: Joi.number().integer().min(1).optional(),
    isPremium: Joi.boolean().optional(),
    price: Joi.number().min(0).optional(),
});

const createRandomExamSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    topic: Joi.string().required(),
    questionCount: Joi.number().integer().min(1).required(),
    examType: Joi.string().valid('practice', 'midterm', 'final', 'custom').optional(),
    timeLimit: Joi.number().integer().min(1).optional(),
    isPremium: Joi.boolean().optional(),
    price: Joi.number().min(0).optional(),
});

// Create an exam manually
exports.createExam = async (req, res) => {
    const { error } = createExamSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const exam = await examService.createExam(req.body);
        res.status(201).json(exam);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Create an exam randomly
exports.createRandomExam = async (req, res) => {
    const { error } = createRandomExamSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const exam = await examService.createRandomExam(req.body);
        res.status(201).json(exam);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Get all exams
exports.getExams = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const exams = await examService.getExams(page, limit);
        res.json(exams);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Get an exam by ID
exports.getExamById = async (req, res) => {
    try {
        const exam = await examService.getExamById(req.params.id);
        res.json(exam);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Update an exam
exports.updateExam = async (req, res) => {
    try {
        const exam = await examService.updateExam(req.params.id, req.body);
        res.json(exam);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Delete an exam
exports.deleteExam = async (req, res) => {
    try {
        const result = await examService.deleteExam(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.errorCode === 'INVALID_ID') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        if (error.errorCode === 'EXAM_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};