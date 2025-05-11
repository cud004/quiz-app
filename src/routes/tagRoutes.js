// src/routes/tagRoutes.js
const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { 
  protect, 
  authorize, 
  validateRequest 
} = require('../middleware');
const { 
  createTagValidation,
  updateTagValidation,
  deleteTagValidation,
  getTagValidation,
  getTagsValidation,
  importTagsValidation
} = require('../validations/tagValidation');

// Public routes
router.get('/', 
  validateRequest(getTagsValidation), 
  tagController.getTags
);

// Admin routes
router.post('/import', 
  protect,
  authorize(['admin']), 
  validateRequest(importTagsValidation), 
  tagController.importTags
);

router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createTagValidation), 
  tagController.createTag
);

router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateTagValidation), 
  tagController.updateTag
);

router.delete('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(deleteTagValidation), 
  tagController.deleteTag
);

// Public route for getting tag by ID - phải đặt sau route /import
router.get('/:id',
  validateRequest(getTagValidation),
  tagController.getTag
);

module.exports = router; 