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

/**
 * @swagger
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Tên thẻ
 *         description:
 *           type: string
 *           description: Mô tả thẻ
 *         slug:
 *           type: string
 *           description: Slug của thẻ (tự động tạo từ tên)
 *         usageCount:
 *           type: number
 *           description: Số lần sử dụng
 *         category:
 *           type: string
 *           description: Danh mục của thẻ
 *         relatedTags:
 *           type: array
 *           items:
 *             type: string
 *           description: Các thẻ liên quan
 *         isActive:
 *           type: boolean
 *           description: Trạng thái hoạt động
 *         performanceStats:
 *           type: object
 *           properties:
 *             totalAttempts:
 *               type: number
 *               description: Tổng số lần sử dụng
 *             correctRate:
 *               type: number
 *               description: Tỷ lệ đúng
 */

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Lấy danh sách thẻ
 *     tags: [Tags]
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
 *         description: Số thẻ mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Danh sách thẻ
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
 *                     $ref: '#/components/schemas/Tag'
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

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Tạo thẻ mới
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tag'
 *     responses:
 *       201:
 *         description: Tạo thẻ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Tag'
 */
router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createTagValidation), 
  tagController.createTag
);

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: Cập nhật thẻ
 *     tags: [Tags]
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
 *             $ref: '#/components/schemas/Tag'
 *     responses:
 *       200:
 *         description: Cập nhật thẻ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Tag'
 */
router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateTagValidation), 
  tagController.updateTag
);

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Xóa thẻ
 *     tags: [Tags]
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
 *         description: Xóa thẻ thành công
 */
router.delete('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(deleteTagValidation), 
  tagController.deleteTag
);

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết thẻ
 *     tags: [Tags]
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
 *         description: Thông tin chi tiết thẻ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Tag'
 */
router.get('/:id',
  validateRequest(getTagValidation),
  tagController.getTag
);

module.exports = router; 