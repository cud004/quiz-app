const mongoose = require('mongoose');
const Tag = require('../models/Tag');
const Topic = require('../models/Topic');

// Tạo tag mới
exports.createTag = async (tagData) => {
  // Kiểm tra topic tồn tại
  const topic = await Topic.findById(tagData.topic);
  if (!topic) {
    throw { errorCode: 'INVALID_TOPIC', message: 'Topic not found' };
  }

  // Kiểm tra tên tag đã tồn tại chưa
  const existingTag = await Tag.findOne({ name: tagData.name });
  if (existingTag) {
    throw { errorCode: 'TAG_NAME_EXISTS', message: 'A tag with this name already exists' };
  }

  // Tạo tag mới
  const tag = new Tag(tagData);
  await tag.save();
  return tag;
};

// Lấy danh sách tag theo topic
exports.getTagsByTopic = async (topicId, page = 1, limit = 10) => {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw { errorCode: 'INVALID_TOPIC_ID', message: 'Invalid topic ID format' };
  }

  const skip = (page - 1) * limit;
  const tags = await Tag.find({ topic: topicId, isActive: true })
    .skip(skip)
    .limit(limit)
    .sort({ name: 1 });

  const total = await Tag.countDocuments({ topic: topicId, isActive: true });

  return {
    tags,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Lấy tất cả tag (có thể lọc theo nhiều topic)
exports.getTags = async (filters = {}, page = 1, limit = 10) => {
  const query = { isActive: true };
  
  if (filters.topic) {
    query.topic = filters.topic;
  }
  
  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const tags = await Tag.find(query)
    .populate('topic', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ name: 1 });

  const total = await Tag.countDocuments(query);

  return {
    tags,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Lấy tag theo ID
exports.getTagById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { errorCode: 'INVALID_ID', message: 'Invalid tag ID format' };
  }

  const tag = await Tag.findById(id).populate('topic', 'name');
  if (!tag) {
    throw { errorCode: 'TAG_NOT_FOUND', message: 'Tag not found' };
  }

  return tag;
};

// Cập nhật tag
exports.updateTag = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { errorCode: 'INVALID_ID', message: 'Invalid tag ID format' };
  }

  // Kiểm tra tag tồn tại
  const tag = await Tag.findById(id);
  if (!tag) {
    throw { errorCode: 'TAG_NOT_FOUND', message: 'Tag not found' };
  }

  // Nếu cập nhật topic, kiểm tra topic tồn tại
  if (updateData.topic) {
    const topic = await Topic.findById(updateData.topic);
    if (!topic) {
      throw { errorCode: 'INVALID_TOPIC', message: 'Topic not found' };
    }
  }

  // Nếu cập nhật tên, kiểm tra tên đã tồn tại chưa
  if (updateData.name && updateData.name !== tag.name) {
    const existingTag = await Tag.findOne({ name: updateData.name });
    if (existingTag) {
      throw { errorCode: 'TAG_NAME_EXISTS', message: 'A tag with this name already exists' };
    }
  }

  // Cập nhật tag
  const updatedTag = await Tag.findByIdAndUpdate(id, updateData, { new: true }).populate('topic', 'name');
  return updatedTag;
};

// Xóa tag (soft delete)
exports.deleteTag = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { errorCode: 'INVALID_ID', message: 'Invalid tag ID format' };
  }

  // Kiểm tra tag tồn tại
  const tag = await Tag.findById(id);
  if (!tag) {
    throw { errorCode: 'TAG_NOT_FOUND', message: 'Tag not found' };
  }

  // Soft delete bằng cách set isActive = false
  await Tag.findByIdAndUpdate(id, { isActive: false });

  return { message: 'Tag deleted successfully', id };
};
