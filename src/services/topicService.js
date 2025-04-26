const mongoose = require('mongoose');
const Topic = require('../models/Topic');
const Question = require('../models/Question');

exports.createTopic = async ({ name, description, parentTopic }) => {
  const existingTopic = await Topic.findOne({ name });
  if (existingTopic) {
    const error = new Error('Topic name already exists');
    error.errorCode = 'TOPIC_NAME_EXISTS';
    throw error;
  }

  if (parentTopic) {
    if (!mongoose.Types.ObjectId.isValid(parentTopic)) {
      const error = new Error('Invalid parent topic ID');
      error.errorCode = 'INVALID_PARENT_TOPIC';
      throw error;
    }
    const parent = await Topic.findById(parentTopic);
    if (!parent) {
      const error = new Error('Parent topic not found');
      error.errorCode = 'PARENT_TOPIC_NOT_FOUND';
      throw error;
    }
  }

  const topic = new Topic({ name, description, parentTopic });
  await topic.save();

  // Trả về thông tin chi tiết của chủ đề
  return await Topic.findById(topic._id).lean();
};

exports.getTopics = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = { isActive: true };

  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' }; // Tìm kiếm theo tên
  }
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  const topics = await Topic.find(query)
    .skip(skip)
    .limit(limit)
    .lean();

  // Thêm số lượng câu hỏi và tên chủ đề cha vào từng chủ đề
  for (const topic of topics) {
    topic.questionCount = await Question.countDocuments({ topic: topic._id, isActive: true });
    if (topic.parentTopic) {
      const parent = await Topic.findById(topic.parentTopic).select('name');
      topic.parentTopicName = parent ? parent.name : null;
    }
  }

  const total = await Topic.countDocuments(query);

  return { topics, total, page, limit };
};

exports.getTopicById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid ID format');
    error.errorCode = 'INVALID_ID';
    throw error;
  }
  const topic = await Topic.findById(id).lean();
  if (!topic || !topic.isActive) {
    const error = new Error('Topic not found');
    error.errorCode = 'TOPIC_NOT_FOUND';
    throw error;
  }

  // Thêm số lượng câu hỏi và tên chủ đề cha
  topic.questionCount = await Question.countDocuments({ topic: id, isActive: true });
  if (topic.parentTopic) {
    const parent = await Topic.findById(topic.parentTopic).select('name');
    topic.parentTopicName = parent ? parent.name : null;
  }

  return topic;
};

exports.updateTopic = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid ID format');
    error.errorCode = 'INVALID_ID';
    throw error;
  }

  if (updateData.name) {
    const existingTopic = await Topic.findOne({ name: updateData.name, _id: { $ne: id } });
    if (existingTopic) {
      const error = new Error('Topic name already exists');
      error.errorCode = 'TOPIC_NAME_EXISTS';
      throw error;
    }
  }

  if (updateData.parentTopic) {
    if (!mongoose.Types.ObjectId.isValid(updateData.parentTopic)) {
      const error = new Error('Invalid parent topic ID');
      error.errorCode = 'INVALID_PARENT_TOPIC';
      throw error;
    }
    const parent = await Topic.findById(updateData.parentTopic);
    if (!parent) {
      const error = new Error('Parent topic not found');
      error.errorCode = 'PARENT_TOPIC_NOT_FOUND';
      throw error;
    }
  }

  const allowedUpdates = ['name', 'description', 'parentTopic'];
  const updates = {};
  for (const key of allowedUpdates) {
    if (updateData[key] !== undefined) {
      updates[key] = updateData[key];
    }
  }

  const topic = await Topic.findByIdAndUpdate(
    id,
    { ...updates, updatedAt: Date.now() },
    { new: true }
  ).lean();
  if (!topic || !topic.isActive) {
    const error = new Error('Topic not found');
    error.errorCode = 'TOPIC_NOT_FOUND';
    throw error;
  }

  // Thêm số lượng câu hỏi và tên chủ đề cha
  topic.questionCount = await Question.countDocuments({ topic: id, isActive: true });
  if (topic.parentTopic) {
    const parent = await Topic.findById(topic.parentTopic).select('name');
    topic.parentTopicName = parent ? parent.name : null;
  }

  return topic;
};

exports.deleteTopic = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid ID format');
    error.errorCode = 'INVALID_ID';
    throw error;
  }

  const topic = await Topic.findById(id);
  if (!topic || !topic.isActive) {
    const error = new Error('Topic not found');
    error.errorCode = 'TOPIC_NOT_FOUND';
    throw error;
  }

  const questionCount = await Question.countDocuments({ topic: id });
  if (questionCount > 0) {
    const error = new Error('Cannot delete topic with associated questions');
    error.errorCode = 'TOPIC_IN_USE';
    throw error;
  }

  topic.isActive = false; // Soft delete
  await topic.save();

  return { message: 'Topic deactivated', topicId: id };
};