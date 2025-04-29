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
    tags: Joi.array().items(Joi.string()).optional(),
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
    tags: Joi.array().items(Joi.string()).optional(),
});

const examSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  questions: Joi.array().items(Joi.string()).optional(),
  topics: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  timeLimit: Joi.number().min(0).max(180).optional(),
  isPremium: Joi.boolean().optional(),
  price: Joi.number().min(0).optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').optional(),
  examType: Joi.string().valid('practice', 'midterm', 'final', 'custom').optional(),
  recommendedFor: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('draft', 'published', 'archived').optional()
});

const randomExamSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  questionCount: Joi.number().min(1).required(),
  topics: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard', 'mixed').optional(),
  timeLimit: Joi.number().min(0).max(180).optional(),
  isPremium: Joi.boolean().optional(),
  price: Joi.number().min(0).optional(),
  examType: Joi.string().valid('practice', 'midterm', 'final', 'custom').optional(),
  status: Joi.string().valid('draft', 'published', 'archived').optional()
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

// User: Tạo đề thi cá nhân thủ công
exports.createPersonalExam = async (req, res) => {
    const { error } = examSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        // Kiểm tra quyền truy cập cho các câu hỏi và chủ đề
        if (req.body.questions && req.body.questions.length > 0) {
            await examService.validateQuestionsAccess(req.body.questions, req.user._id);
        }
        
        if (req.body.topics && req.body.topics.length > 0) {
            await examService.validateTopicsAccess(req.body.topics, req.user._id);
        }
        
        if (req.body.tags && req.body.tags.length > 0) {
            await examService.validateTags(req.body.tags);
        }
        
        const examData = {
            ...req.body,
            createdBy: req.user._id,
            isPersonal: true,
            status: req.body.status || 'published' // Mặc định là published cho đề thi cá nhân
        };
        
        const exam = await examService.createExam(examData);
        res.status(201).json(exam);
    } catch (error) {
        if (error.errorCode) {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// User: Tạo đề thi cá nhân ngẫu nhiên
exports.createPersonalRandomExam = async (req, res) => {
    const { error } = randomExamSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        // Kiểm tra quyền truy cập cho các chủ đề
        if (req.body.topics && req.body.topics.length > 0) {
            await examService.validateTopicsAccess(req.body.topics, req.user._id);
        }
        
        if (req.body.tags && req.body.tags.length > 0) {
            await examService.validateTags(req.body.tags);
        }
        
        const examData = {
            ...req.body,
            createdBy: req.user._id,
            isPersonal: true,
            status: req.body.status || 'published' // Mặc định là published cho đề thi cá nhân
        };
        
        const exam = await examService.createRandomExam(examData);
        res.status(201).json(exam);
    } catch (error) {
        if (error.errorCode) {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Lấy danh sách đề thi công khai
exports.getExams = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        isPersonal: false,
        ...req.query
    };

    try {
        const exams = await examService.getExams(page, limit, filters);
        res.json(exams);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Lấy danh sách đề thi cá nhân của người dùng hiện tại
exports.getPersonalExams = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        isPersonal: true,
        createdBy: req.user._id,
        ...req.query
    };

    try {
        const exams = await examService.getExams(page, limit, filters);
        res.json(exams);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Lấy chi tiết một đề thi
exports.getExamById = async (req, res) => {
    try {
        const exam = await examService.getExamById(req.params.id);
        
        // Kiểm tra quyền truy cập nếu là đề thi cá nhân
        if (exam.isPersonal && (!req.user || exam.createdBy.toString() !== req.user._id.toString())) {
            return res.status(403).json({ 
                errorCode: 'FORBIDDEN', 
                message: 'You do not have permission to access this exam' 
            });
        }
        
        res.json(exam);
    } catch (error) {
        if (error.errorCode === 'EXAM_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Admin: Cập nhật đề thi
exports.updateExam = async (req, res) => {
    const { error } = examSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const exam = await examService.updateExam(req.params.id, req.body);
        res.json(exam);
    } catch (error) {
        if (error.errorCode === 'EXAM_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// User: Cập nhật đề thi cá nhân
exports.updatePersonalExam = async (req, res) => {
    const { error } = examSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        // Kiểm tra xem đề thi có phải của người dùng hiện tại không
        const exam = await examService.getExamById(req.params.id);
        
        if (!exam.isPersonal || exam.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                errorCode: 'FORBIDDEN', 
                message: 'You do not have permission to update this exam' 
            });
        }
        
        // Kiểm tra quyền truy cập cho các câu hỏi và chủ đề mới
        if (req.body.questions && req.body.questions.length > 0) {
            await examService.validateQuestionsAccess(req.body.questions, req.user._id);
        }
        
        if (req.body.topics && req.body.topics.length > 0) {
            await examService.validateTopicsAccess(req.body.topics, req.user._id);
        }
        
        if (req.body.tags && req.body.tags.length > 0) {
            await examService.validateTags(req.body.tags);
        }
        
        const updatedExam = await examService.updateExam(req.params.id, req.body);
        res.json(updatedExam);
    } catch (error) {
        if (error.errorCode === 'EXAM_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        if (error.errorCode === 'FORBIDDEN') {
            return res.status(403).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Admin: Xóa đề thi
exports.deleteExam = async (req, res) => {
    try {
        const result = await examService.deleteExam(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.errorCode === 'EXAM_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// User: Xóa đề thi cá nhân
exports.deletePersonalExam = async (req, res) => {
    try {
        // Kiểm tra xem đề thi có phải của người dùng hiện tại không
        const exam = await examService.getExamById(req.params.id);
        
        if (!exam.isPersonal || exam.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                errorCode: 'FORBIDDEN', 
                message: 'You do not have permission to delete this exam' 
            });
        }
        
        const result = await examService.deleteExam(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.errorCode === 'EXAM_NOT_FOUND') {
            return res.status(404).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};