const examService = require('../services/exam/examService');
const ApiResponse = require('../utils/apiResponse');

const examController = {
  // Lấy danh sách đề thi
  getExams: async (req, res) => {
    try {
      // Lấy danh sách đề và phân trang
      const result = await examService.getExams(req.query, req.user);
  
      // Lấy danh sách topic cho dropdown
      const Topic = require('../models/Topic');
      const topics = await Topic.find({}, '_id name').sort('name');

      // Danh sách độ khó và accessLevel cố định
      const difficulties = [
        { value: 'easy', label: 'Dễ' },
        { value: 'medium', label: 'Trung bình' },
        { value: 'hard', label: 'Khó' }
      ];
      const accessLevels = [
        { value: 'free', label: 'Miễn phí' },
        { value: 'premium', label: 'Premium' }
      ];

      return res.json({
        success: true,
        exams: result.exams,
        pagination: result.pagination,
        total: result.pagination.total,
        topics,
        difficulties,
        accessLevels
      });
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  // Lấy chi tiết đề thi theo ID
  getExam: async (req, res) => {
    try {
      // Xác định xem có hiển thị đáp án không (admin luôn thấy, user không thấy)
      const includeAnswers = req.user && req.user.role === 'admin';
      
      const result = await examService.getExamById(req.params.id, includeAnswers);
      
      return ApiResponse.success(
        res,
        {
          exam: result.exam,
          metadata: result.metadata
        },
        'Exam retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Tạo đề thi mới
  createExam: async (req, res) => {
    try {
      // Thêm người tạo vào dữ liệu
      const examData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      const exam = await examService.createExam(examData);

      return ApiResponse.success(
        res,
        exam,
        'Exam created successfully',
        201
      );
    } catch (error) {
      // Xử lý các lỗi cụ thể
      if (error.message.includes('Topic with ID') || 
          error.message.includes('Tag with ID')) {
        return ApiResponse.validationError(res, [{ field: 'topics', message: error.message }]);
      }
      
      if (error.message.includes('Question with ID')) {
        return ApiResponse.validationError(res, [{ field: 'questions', message: error.message }]);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },

  // Cập nhật đề thi
  updateExam: async (req, res) => {
    try {
      const exam = await examService.updateExam(req.params.id, req.body);

      return ApiResponse.success(
        res,
        exam,
        'Exam updated successfully'
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('published exam')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      // Xử lý các lỗi cụ thể
      if (error.message.includes('Topic with ID') || 
          error.message.includes('Tag with ID')) {
        return ApiResponse.validationError(res, [{ field: 'topics', message: error.message }]);
      }
      
      if (error.message.includes('Question with ID')) {
        return ApiResponse.validationError(res, [{ field: 'questions', message: error.message }]);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },

  // Xóa đề thi
  deleteExam: async (req, res) => {
    try {
      const result = await examService.deleteExam(req.params.id);

      return ApiResponse.success(
        res,
        null,
        result.message
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('has been attempted')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Publish/Unpublish đề thi
  setPublishStatus: async (req, res) => {
    try {
      const { isPublished } = req.body;
      const result = await examService.setPublishStatus(req.params.id, isPublished);
      
      // Nếu có cảnh báo, thêm vào response
      if (result.warning) {
        return ApiResponse.success(
          res,
          result.exam,
          result.message,
          200,
          { warning: true }
        );
      }
      
      return ApiResponse.success(
        res,
        result.exam,
        result.message
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Tạo đề thi ngẫu nhiên
  generateRandomExam: async (req, res) => {
    try {
      // Thêm người tạo vào options
      const options = {
        ...req.body,
        createdBy: req.user._id
      };
      
      const result = await examService.generateRandomExam(options);

      return ApiResponse.success(
        res,
        result.exam,
        'Random exam generated successfully',
        201
      );
    } catch (error) {
      if (error.message.includes('Not enough questions')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      // Xử lý các lỗi cụ thể
      if (error.message.includes('Topic with ID') || 
          error.message.includes('Tag with ID')) {
        return ApiResponse.validationError(res, [{ field: 'topics', message: error.message }]);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Sao chép đề thi
  duplicateExam: async (req, res) => {
    try {
      const exam = await examService.duplicateExam(req.params.id, req.user._id);

      return ApiResponse.success(
        res,
        exam,
        'Exam duplicated successfully',
        201
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Cập nhật thống kê đề thi
  updateExamStats: async (req, res) => {
    try {
      const updatedExam = await examService.updateExamStats(req.params.id, req.body);

      return ApiResponse.success(
        res,
        updatedExam,
        'Exam statistics updated successfully'
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Lấy thống kê chi tiết của đề thi
  getExamStats: async (req, res) => {
    try {
      const examId = req.params.id;
      const stats = await examService.getExamStats(examId);
      
      return ApiResponse.success(
        res,
        stats,
        'Exam statistics retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = examController; 