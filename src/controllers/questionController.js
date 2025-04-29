const Joi = require('joi');
const questionService = require('../services/questionService');

const questionSchema = Joi.object({
    content: Joi.string().required(), 
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
    content: Joi.string().optional(), 
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

// Admin: Tạo câu hỏi mới
exports.createQuestion = async (req, res) => {
    const { error } = questionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const questionData = {
            ...req.body,
            createdBy: req.user._id,
            isPersonal: false
        };
        const question = await questionService.createQuestion(questionData);
        res.status(201).json(question);
    } catch (error) {
        if (error.errorCode === 'QUESTION_CONTENT_EXISTS' || error.errorCode === 'INVALID_TOPIC') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// User: Tạo câu hỏi cá nhân
exports.createPersonalQuestion = async (req, res) => {
    const { error } = questionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const topic = await questionService.validateTopicAccess(req.body.topic, req.user._id);
        
        const questionData = {
            ...req.body,
            createdBy: req.user._id,
            isPersonal: true
        };
        const question = await questionService.createQuestion(questionData);
        res.status(201).json(question);
    } catch (error) {
        if (error.errorCode === 'QUESTION_CONTENT_EXISTS' || error.errorCode === 'INVALID_TOPIC' || error.errorCode === 'FORBIDDEN') {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Admin: Tạo nhiều câu hỏi
exports.createManyQuestions = async (req, res) => {
    const { error } = bulkQuestionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const questionsData = req.body.map(question => ({
            ...question,
            createdBy: req.user._id,
            isPersonal: false
        }));
        const questions = await questionService.createManyQuestions(questionsData);
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

// User: Tạo nhiều câu hỏi cá nhân
exports.createPersonalManyQuestions = async (req, res) => {
    const { error } = bulkQuestionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const topicIds = [...new Set(req.body.map(q => q.topic))];
        for (const topicId of topicIds) {
            await questionService.validateTopicAccess(topicId, req.user._id);
        }
        
        const questionsData = req.body.map(question => ({
            ...question,
            createdBy: req.user._id,
            isPersonal: true
        }));
        const questions = await questionService.createManyQuestions(questionsData);
        res.status(201).json(questions);
    } catch (error) {
        if (
            error.errorCode === 'QUESTION_CONTENT_EXISTS' ||
            error.errorCode === 'INVALID_TOPIC' ||
            error.errorCode === 'DUPLICATE_QUESTIONS_IN_REQUEST' ||
            error.errorCode === 'FORBIDDEN'
        ) {
            return res.status(400).json({ errorCode: error.errorCode, message: error.message });
        }
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// User: Import câu hỏi từ file Excel/CSV
exports.importQuestionsFromFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ errorCode: 'NO_FILE', message: 'No file uploaded' });
        }
        
        const fileType = req.file.mimetype;
        if (fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
            fileType !== 'application/vnd.ms-excel' &&
            fileType !== 'text/csv') {
            return res.status(400).json({ errorCode: 'INVALID_FILE_TYPE', message: 'File must be Excel or CSV' });
        }
        
        const questions = await questionService.importQuestionsFromFile(req.file, req.user._id);
        res.status(201).json(questions);
    } catch (error) {
        res.status(500).json({ errorCode: 'IMPORT_ERROR', message: error.message });
    }
};

// Lấy danh sách câu hỏi (công khai hoặc cá nhân tùy theo filter)
exports.getQuestions = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        topic: req.query.topic,
        difficulty: req.query.difficulty,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
        isPersonal: false 
    };

    try {
        const questions = await questionService.getQuestions(page, limit, filters);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Lấy danh sách câu hỏi cá nhân của người dùng hiện tại
exports.getPersonalQuestions = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        topic: req.query.topic,
        difficulty: req.query.difficulty,
        tags: req.query.tags ? req.query.tags.split(',') : undefined,
        isPersonal: true,
        createdBy: req.user._id
    };

    try {
        const questions = await questionService.getQuestions(page, limit, filters);
        res.json(questions);
    } catch (error) {
        res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
    }
};

// Lấy chi tiết một câu hỏi
exports.getQuestionById = async (req, res) => {
    try {
        const question = await questionService.getQuestionById(req.params.id);
        
        if (question.isPersonal && (!req.user || question.createdBy.toString() !== req.user._id.toString())) {
            return res.status(403).json({ 
                errorCode: 'FORBIDDEN', 
                message: 'You do not have permission to access this question' 
            });
        }
        
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

// Admin: Cập nhật câu hỏi
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

// User: Cập nhật câu hỏi cá nhân
exports.updatePersonalQuestion = async (req, res) => {
    const { error } = updateQuestionSchema.validate(req.body);
    if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

    try {
        const question = await questionService.getQuestionById(req.params.id);
        
        if (!question.isPersonal || question.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                errorCode: 'FORBIDDEN', 
                message: 'You do not have permission to update this question' 
            });
        }
        
        if (req.body.topic) {
            await questionService.validateTopicAccess(req.body.topic, req.user._id);
        }
        
        const updatedQuestion = await questionService.updateQuestion(req.params.id, req.body);
        res.json(updatedQuestion);
    } catch (error) {
        if (error.errorCode === 'INVALID_ID' || error.errorCode === 'INVALID_TOPIC' || error.errorCode === 'FORBIDDEN') {
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

// Admin: Xóa câu hỏi
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

// User: Xóa câu hỏi cá nhân
exports.deletePersonalQuestion = async (req, res) => {
    try {
        const question = await questionService.getQuestionById(req.params.id);
        
        if (!question.isPersonal || question.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                errorCode: 'FORBIDDEN', 
                message: 'You do not have permission to delete this question' 
            });
        }
        
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

// Admin: Xóa nhiều câu hỏi
exports.deleteManyQuestions = async (req, res) => {
    const { ids } = req.body; 
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