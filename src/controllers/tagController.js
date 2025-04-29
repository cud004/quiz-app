const Joi = require('joi');
const tagService = require('../services/tagService');

// Schema validation
const tagSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  topic: Joi.string().required(),
});

// Utility: Handle errors
const handleError = (res, error) => {
  if (error.errorCode) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ errorCode: error.errorCode, message: error.message });
  }
  res.status(500).json({ errorCode: 'SERVER_ERROR', message: 'Server error', details: error.message });
};

// Create a new tag (admin)
exports.createTag = async (req, res) => {
  const { error } = tagSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const tag = await tagService.createTag(req.body);
    res.status(201).json(tag);
  } catch (error) {
    handleError(res, error);
  }
};

// Get tags by topic
exports.getTagsByTopic = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const tags = await tagService.getTagsByTopic(req.params.topicId, page, limit);
    res.json(tags);
  } catch (error) {
    handleError(res, error);
  }
};

// Get all tags with pagination and filters
exports.getTags = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const filters = {
    topic: req.query.topic,
    name: req.query.name
  };

  try {
    const tags = await tagService.getTags(filters, page, limit);
    res.json(tags);
  } catch (error) {
    handleError(res, error);
  }
};

// Get a tag by ID
exports.getTagById = async (req, res) => {
  try {
    const tag = await tagService.getTagById(req.params.id);
    res.json(tag);
  } catch (error) {
    handleError(res, error);
  }
};

// Update a tag (admin)
exports.updateTag = async (req, res) => {
  const { error } = tagSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const tag = await tagService.updateTag(req.params.id, req.body);
    res.json(tag);
  } catch (error) {
    handleError(res, error);
  }
};

// Delete a tag (admin)
exports.deleteTag = async (req, res) => {
  try {
    const result = await tagService.deleteTag(req.params.id);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};
