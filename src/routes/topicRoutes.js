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

/**
 * @swagger
 * components:
 *   schemas:
 *     Topic:
 *       type: object
 *       required:
 *         - name
 *         - description
 *       properties:
 *         name:
 *           type: string
 *           description: Tên chủ đề
 *         description:
 *           type: string
 *           description: Mô tả chủ đề
 *         parentTopic:
 *           type: string
 *           description: ID của chủ đề cha (nếu có)
 *         order:
 *           type: number
 *           description: Thứ tự hiển thị
 *         isActive:
 *           type: boolean
 *           description: Trạng thái hoạt động
 */

/**
 * @swagger
 * /api/topics:
 *   get:
 *     summary: Lấy danh sách chủ đề
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số chủ đề mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Danh sách chủ đề
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Topic'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
router.get('/', 
  validateRequest(getTopicsValidation), 
  topicController.getTopics
);

/**
 * @swagger
 * /api/topics/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết chủ đề
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin chi tiết chủ đề
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 */
router.get('/:id',
  validateRequest({ params: topicIdParamSchema }),
  topicController.getTopic
);

/**
 * @swagger
 * /api/topics:
 *   post:
 *     summary: Tạo chủ đề mới
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Topic'
 *     responses:
 *       201:
 *         description: Tạo chủ đề thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 */
router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createTopicValidation), 
  topicController.createTopic
);

/**
 * @swagger
 * /api/topics/{id}:
 *   put:
 *     summary: Cập nhật chủ đề
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Topic'
 *     responses:
 *       200:
 *         description: Cập nhật chủ đề thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Topic'
 */
router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateTopicValidation), 
  topicController.updateTopic
);

/**
 * @swagger
 * /api/topics/{id}:
 *   delete:
 *     summary: Xóa chủ đề
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa chủ đề thành công
 */
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