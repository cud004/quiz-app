// src/services/topicService.js
const Topic = require('../../models/Topic');

const topicService = {
  // Lấy danh sách topics
  async getTopics(query) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'order', 
      sortOrder = 'asc',
      category,
      difficulty,
      name,
      isActive 
    } = query;
    
    // Xây dựng filter
    const filter = {};
    
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const topics = await Topic.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Topic.countDocuments(filter);

    return {
      topics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Lấy chi tiết một topic theo ID
  async getTopicById(id) {
    const topic = await Topic.findById(id)
      .populate('parentTopic', 'name description')
      .populate('createdBy', 'name email');
    
    if (!topic) {
      throw new Error('Topic not found');
    }
    
    return topic;
  },

  // Tạo topic mới
  async createTopic(topicData) {
    // Validate parent topic if exists
    if (topicData.parentTopic) {
      const parent = await Topic.findById(topicData.parentTopic);
      if (!parent) {
        throw new Error('Parent topic not found');
      }
    }

    const topic = new Topic(topicData);
    await topic.save();
    return topic;
  },

  // Cập nhật topic
  async updateTopic(id, updateData) {
    // Validate parent topic if exists
    if (updateData.parentTopic) {
      const parent = await Topic.findById(updateData.parentTopic);
      if (!parent) {
        throw new Error('Parent topic not found');
      }
    }

    const topic = await Topic.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!topic) {
      throw new Error('Topic not found');
    }

    return topic;
  },

  // Xóa topic
  async deleteTopic(id) {
    // Kiểm tra topic tồn tại
    const topic = await Topic.findById(id);
    
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Kiểm tra nếu topic có children
    const hasChildren = await Topic.exists({ parentTopic: id });
    if (hasChildren) {
      throw new Error('Cannot delete topic with children');
    }

    // Xóa topic
    await Topic.findByIdAndDelete(id);
    return true;
  },

  // Import nhiều topics
  async importTopics(topics) {
    // Validate parent topics
    for (const topic of topics) {
      if (topic.parentTopic) {
        const parent = await Topic.findById(topic.parentTopic);
        if (!parent) {
          throw new Error(`Parent topic not found for topic: ${topic.name}`);
        }
      }
    }

    const insertedTopics = await Topic.insertMany(topics, {
      ordered: false
    });

    return insertedTopics;
  },

  // Reorder topics
  async reorderTopics() {
    const topics = await Topic.find().sort('order');
    for (let i = 0; i < topics.length; i++) {
      topics[i].order = i;
      await topics[i].save();
    }
    return topics;
  }
};

module.exports = topicService;