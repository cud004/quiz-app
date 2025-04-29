const Joi = require('joi');
const topicService = require('../services/topicService');

// Schema validation
const topicSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  parentTopic: Joi.string().optional(),
});

// Utility: Handle errors
const handleError = (res, error) => {
  if (error.errorCode) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ errorCode: error.errorCode, message: error.message });
  }
  res.status(500).json({ errorCode: 'SERVER_ERROR', message: 'Server error', details: error.message });
};

// Create a new topic (admin only)
exports.createTopic = async (req, res) => {
  const { error } = topicSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const topicData = {
      ...req.body,
      createdBy: req.user._id,
      isPersonal: false
    };
    const topic = await topicService.createTopic(topicData);
    res.status(201).json(topic);
  } catch (error) {
    handleError(res, error);
  }
};

// Get all topics with pagination
exports.getTopics = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    // Tạo filters dựa trên query params
    const filters = {
      name: req.query.name,
      // Nếu là admin và có yêu cầu xem tất cả, bao gồm cả inactive
      includeInactive: req.user.role === 'admin' && req.query.includeInactive === 'true'
    };
    
    const topics = await topicService.getTopics(page, limit, filters);
    res.json(topics);
  } catch (error) {
    handleError(res, error);
  }
};

// Get a topic by ID
exports.getTopicById = async (req, res) => {
  try {
    const topic = await topicService.getTopicById(req.params.id);
    res.json(topic);
  } catch (error) {
    handleError(res, error);
  }
};

// Update a topic
exports.updateTopic = async (req, res) => {
  const { error } = topicSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const topic = await topicService.updateTopic(req.params.id, req.body);
    res.json(topic);
  } catch (error) {
    handleError(res, error);
  }
};

// Delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const result = await topicService.deleteTopic(req.params.id);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};