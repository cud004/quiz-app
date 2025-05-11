const mongoose = require('mongoose');
const LearningPath = require('../models/LearningPath');
const Topic = require('../models/Topic');
const Exam = require('../models/Exam');
const userPerformanceService = require('./userPerformanceService');
const examRecommendationService = require('./examRecommendationService');

const learningPathService = {
  /**
   * Lấy lộ trình học tập của người dùng
   * @param {string} userId - ID của người dùng
   * @returns {Object} Lộ trình học tập
   */
  async getLearningPath(userId) {
    // Tìm lộ trình học tập hiện có hoặc tạo mới nếu chưa có
    let learningPath = await LearningPath.findOne({ user: userId })
      .populate('topics.topic', 'name description difficulty')
      .populate('recommendedExams', 'title description difficulty');
    
    // Nếu chưa có lộ trình, tạo lộ trình mới
    if (!learningPath) {
      learningPath = await this.createInitialLearningPath(userId);
    } else {
      // Cập nhật lộ trình nếu đã lâu chưa cập nhật (7 ngày)
      const lastUpdated = new Date(learningPath.lastUpdated);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdated) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate >= 7) {
        learningPath = await this.updateLearningPath(userId);
      }
    }
    
    return learningPath;
  },
  
  /**
   * Tạo lộ trình học tập ban đầu cho người dùng
   * @param {string} userId - ID của người dùng
   * @returns {Object} Lộ trình học tập mới
   */
  async createInitialLearningPath(userId) {
    // Lấy các chủ đề cần cải thiện
    const suggestedTopics = await userPerformanceService.getImprovementSuggestions(userId);
    
    // Nếu không có dữ liệu về hiệu suất, lấy các chủ đề phổ biến
    let topics = [];
    
    if (suggestedTopics.length === 0) {
      // Lấy 5 chủ đề phổ biến nhất
      const popularTopics = await Topic.find({ isActive: true })
        .sort({ 'performanceStats.totalAttempts': -1 })
        .limit(5);
      
      topics = popularTopics.map(topic => ({
        topic: topic._id,
        priority: 1,
        progress: 0
      }));
    } else {
      // Sử dụng các chủ đề cần cải thiện
      topics = suggestedTopics.map((topic, index) => ({
        topic: topic.topicId,
        priority: index + 1,
        progress: (100 - topic.accuracy) / 100
      }));
    }
    
    // Lấy các đề thi được đề xuất
    const recommendedExams = await examRecommendationService.getRecommendedExams(userId, 3);
    const examIds = recommendedExams.map(exam => exam.id);
    
    // Tạo lộ trình mới
    const learningPath = await LearningPath.create({
      user: userId,
      topics,
      recommendedExams: examIds,
      lastUpdated: new Date()
    });
    
    // Populate dữ liệu
    return LearningPath.findById(learningPath._id)
      .populate('topics.topic', 'name description difficulty')
      .populate('recommendedExams', 'title description difficulty');
  },
  
  /**
   * Cập nhật lộ trình học tập của người dùng
   * @param {string} userId - ID của người dùng
   * @returns {Object} Lộ trình học tập đã cập nhật
   */
  async updateLearningPath(userId) {
    // Lấy lộ trình hiện tại
    const currentPath = await LearningPath.findOne({ user: userId });
    
    if (!currentPath) {
      return this.createInitialLearningPath(userId);
    }
    
    // Lấy các chủ đề cần cải thiện
    const suggestedTopics = await userPerformanceService.getImprovementSuggestions(userId);
    
    // Tạo danh sách chủ đề mới
    const existingTopicIds = currentPath.topics.map(t => t.topic.toString());
    const newTopicIds = suggestedTopics.map(t => t.topicId);
    
    // Các chủ đề cần thêm vào (có trong suggested nhưng không có trong current)
    const topicsToAdd = suggestedTopics
      .filter(topic => !existingTopicIds.includes(topic.topicId))
      .map((topic, index) => ({
        topic: topic.topicId,
        priority: index + 1,
        progress: (100 - topic.accuracy) / 100
      }));
    
    // Cập nhật tiến độ cho các chủ đề hiện có
    const updatedTopics = currentPath.topics.map(topic => {
      const topicId = topic.topic.toString();
      const suggestedTopic = suggestedTopics.find(t => t.topicId === topicId);
      
      if (suggestedTopic) {
        // Cập nhật tiến độ nếu chủ đề vẫn cần cải thiện
        return {
          topic: topicId,
          priority: topic.priority,
          progress: (100 - suggestedTopic.accuracy) / 100
        };
      } else if (newTopicIds.includes(topicId)) {
        // Giữ lại nếu vẫn trong danh sách cần học
        return {
          topic: topicId,
          priority: topic.priority,
          progress: topic.progress
        };
      }
      // Nếu không còn trong danh sách cần cải thiện, loại bỏ
      return null;
    }).filter(topic => topic !== null);
    
    // Kết hợp chủ đề hiện có và chủ đề mới
    const combinedTopics = [...updatedTopics, ...topicsToAdd];
    
    // Sắp xếp lại theo priority
    combinedTopics.sort((a, b) => a.priority - b.priority);
    
    // Lấy các đề thi được đề xuất mới
    const recommendedExams = await examRecommendationService.getRecommendedExams(userId, 3);
    const examIds = recommendedExams.map(exam => exam.id);
    
    // Cập nhật lộ trình
    const updatedPath = await LearningPath.findOneAndUpdate(
      { user: userId },
      { 
        topics: combinedTopics, 
        recommendedExams: examIds,
        lastUpdated: new Date()
      },
      { new: true }
    ).populate('topics.topic', 'name description difficulty')
     .populate('recommendedExams', 'title description difficulty');
    
    return updatedPath;
  },
  
  /**
   * Cập nhật tiến độ cho một chủ đề trong lộ trình
   * @param {string} userId - ID của người dùng
   * @param {string} topicId - ID của chủ đề
   * @param {number} progress - Tiến độ mới (0-1)
   * @returns {Object} Lộ trình học tập đã cập nhật
   */
  async updateTopicProgress(userId, topicId, progress) {
    // Kiểm tra giá trị progress hợp lệ
    if (progress < 0 || progress > 1) {
      throw new Error('Tiến độ phải là giá trị từ 0 đến 1');
    }
    
    // Tìm lộ trình học tập
    const learningPath = await LearningPath.findOne({ user: userId });
    
    if (!learningPath) {
      throw new Error('Không tìm thấy lộ trình học tập');
    }
    
    // Tìm chủ đề cần cập nhật
    const topicIndex = learningPath.topics.findIndex(
      t => t.topic.toString() === topicId
    );
    
    if (topicIndex === -1) {
      throw new Error('Không tìm thấy chủ đề trong lộ trình học tập');
    }
    
    // Cập nhật tiến độ
    learningPath.topics[topicIndex].progress = progress;
    await learningPath.save();
    
    // Trả về lộ trình đã cập nhật
    return LearningPath.findById(learningPath._id)
      .populate('topics.topic', 'name description difficulty')
      .populate('recommendedExams', 'title description difficulty');
  },
  
  /**
   * Cập nhật ưu tiên cho một chủ đề trong lộ trình
   * @param {string} userId - ID của người dùng
   * @param {string} topicId - ID của chủ đề
   * @param {number} priority - Ưu tiên mới
   * @returns {Object} Lộ trình học tập đã cập nhật
   */
  async updateTopicPriority(userId, topicId, priority) {
    // Kiểm tra giá trị priority hợp lệ
    if (priority < 1) {
      throw new Error('Ưu tiên phải là số dương');
    }
    
    // Tìm lộ trình học tập
    const learningPath = await LearningPath.findOne({ user: userId });
    
    if (!learningPath) {
      throw new Error('Không tìm thấy lộ trình học tập');
    }
    
    // Tìm chủ đề cần cập nhật
    const topicIndex = learningPath.topics.findIndex(
      t => t.topic.toString() === topicId
    );
    
    if (topicIndex === -1) {
      throw new Error('Không tìm thấy chủ đề trong lộ trình học tập');
    }
    
    // Cập nhật ưu tiên
    learningPath.topics[topicIndex].priority = priority;
    
    // Sắp xếp lại theo ưu tiên
    learningPath.topics.sort((a, b) => a.priority - b.priority);
    
    await learningPath.save();
    
    // Trả về lộ trình đã cập nhật
    return LearningPath.findById(learningPath._id)
      .populate('topics.topic', 'name description difficulty')
      .populate('recommendedExams', 'title description difficulty');
  },
  
  /**
   * Xóa một chủ đề khỏi lộ trình học tập
   * @param {string} userId - ID của người dùng
   * @param {string} topicId - ID của chủ đề
   * @returns {Object} Lộ trình học tập đã cập nhật
   */
  async removeTopicFromPath(userId, topicId) {
    // Tìm lộ trình học tập
    const learningPath = await LearningPath.findOne({ user: userId });
    
    if (!learningPath) {
      throw new Error('Không tìm thấy lộ trình học tập');
    }
    
    // Lọc bỏ chủ đề cần xóa
    learningPath.topics = learningPath.topics.filter(
      t => t.topic.toString() !== topicId
    );
    
    await learningPath.save();
    
    // Trả về lộ trình đã cập nhật
    return LearningPath.findById(learningPath._id)
      .populate('topics.topic', 'name description difficulty')
      .populate('recommendedExams', 'title description difficulty');
  },
  
  /**
   * Thêm một chủ đề vào lộ trình học tập
   * @param {string} userId - ID của người dùng
   * @param {string} topicId - ID của chủ đề
   * @param {number} priority - Ưu tiên (tùy chọn)
   * @returns {Object} Lộ trình học tập đã cập nhật
   */
  async addTopicToPath(userId, topicId, priority = null) {
    // Tìm lộ trình học tập
    let learningPath = await LearningPath.findOne({ user: userId });
    
    if (!learningPath) {
      // Tạo mới nếu chưa có
      learningPath = await this.createInitialLearningPath(userId);
    }
    
    // Kiểm tra chủ đề đã tồn tại
    const existingTopic = learningPath.topics.find(
      t => t.topic.toString() === topicId
    );
    
    if (existingTopic) {
      throw new Error('Chủ đề đã tồn tại trong lộ trình học tập');
    }
    
    // Xác định ưu tiên
    const actualPriority = priority || 
      (learningPath.topics.length > 0 
        ? Math.max(...learningPath.topics.map(t => t.priority)) + 1 
        : 1);
    
    // Thêm chủ đề mới
    learningPath.topics.push({
      topic: topicId,
      priority: actualPriority,
      progress: 0
    });
    
    // Sắp xếp lại theo ưu tiên
    learningPath.topics.sort((a, b) => a.priority - b.priority);
    
    await learningPath.save();
    
    // Trả về lộ trình đã cập nhật
    return LearningPath.findById(learningPath._id)
      .populate('topics.topic', 'name description difficulty')
      .populate('recommendedExams', 'title description difficulty');
  }
};

module.exports = learningPathService; 