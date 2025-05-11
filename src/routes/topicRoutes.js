// src/routes/topicRoutes.js
const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const { 
  protect, 
  authorize, 
  validateRequest 
} = require('../middleware');
const { 
  createTopicValidation,
  updateTopicValidation,
  deleteTopicValidation,
  getTopicsValidation,
  importTopicsValidation,
  topicIdParamSchema
} = require('../validations/topicValidation');

// Public routes
router.get('/', 
  validateRequest(getTopicsValidation), 
  topicController.getTopics
);

// Get topic by ID
router.get('/:id',
  validateRequest({ params: topicIdParamSchema }),
  topicController.getTopic
);

// Admin routes - Bảo vệ tất cả các route admin
router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createTopicValidation), 
  topicController.createTopic
);

router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateTopicValidation), 
  topicController.updateTopic
);

router.delete('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(deleteTopicValidation), 
  topicController.deleteTopic
);

router.post('/import', 
  protect,
  authorize(['admin']), 
  validateRequest(importTopicsValidation), 
  topicController.importTopics
);

module.exports = router;