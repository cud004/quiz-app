const Joi = require('joi');
const userService = require('../services/userService');

// Schema validation
const userSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  class: Joi.string().optional(),
  profileImage: Joi.string().optional(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  class: Joi.string().optional(),
  profileImage: Joi.string().optional(),
});

// Utility: Handle errors
const handleError = (res, error) => {
  if (error.message === 'Invalid ID format') {
    return res.status(400).json({ errorCode: 'INVALID_ID', message: error.message });
  }
  if (error.message === 'User not found') {
    return res.status(404).json({ errorCode: 'USER_NOT_FOUND', message: error.message });
  }
  if (error.message === 'Email already exists') {
    return res.status(400).json({ errorCode: 'EMAIL_EXISTS', message: error.message });
  }
  res.status(500).json({ errorCode: 'SERVER_ERROR', message: 'Server error', details: error.message });
};

// Create a new user
exports.createUser = async (req, res) => {
  const { error } = userSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    handleError(res, error);
  }
};

// Get all users with pagination
exports.getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const users = await userService.getUsers(page, limit);
    res.json(users);
  } catch (error) {
    handleError(res, error);
  }
};

// Get a user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    handleError(res, error);
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  const { error } = updateUserSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    handleError(res, error);
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};