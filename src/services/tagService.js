const Tag = require('../models/Tag');

const tagService = {
  // Lấy danh sách tags
  async getTags(query) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'name', 
      sortOrder = 'asc',
      category,
      name,
      isActive 
    } = query;
    
    // Xây dựng filter
    const filter = {};
    
    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const tags = await Tag.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tag.countDocuments(filter);

    return {
      tags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Lấy chi tiết một tag theo ID
  async getTagById(id) {
    const tag = await Tag.findById(id)
      .populate('relatedTags', 'name description slug usageCount category');
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    // Tìm các tags tương tự dựa trên category nếu có
    let similarTags = [];
    if (tag.category) {
      similarTags = await Tag.find({
        category: tag.category,
        _id: { $ne: id }, // Không bao gồm tag hiện tại
        isActive: true
      })
        .select('name description slug usageCount')
        .sort({ usageCount: -1 })
        .limit(5);
    }

    // Tìm các tags phổ biến nhất
    const popularTags = await Tag.find({
      _id: { $ne: id }, // Không bao gồm tag hiện tại
      isActive: true
    })
      .select('name description slug usageCount category')
      .sort({ usageCount: -1 })
      .limit(5);
    
    return {
      tag,
      similarTags,
      popularTags
    };
  },

  // Tạo tag mới
  async createTag(tagData) {
    // Kiểm tra xem tag đã tồn tại chưa
    const existingTag = await Tag.findOne({ name: tagData.name });
    if (existingTag) {
      throw new Error('Tag with this name already exists');
    }

    // Validate relatedTags if exists
    if (tagData.relatedTags && tagData.relatedTags.length > 0) {
      for (const relatedTagId of tagData.relatedTags) {
        const relatedTag = await Tag.findById(relatedTagId);
        if (!relatedTag) {
          throw new Error(`Related tag with ID ${relatedTagId} not found`);
        }
      }
    }

    const tag = new Tag(tagData);
    await tag.save();
    return tag;
  },

  // Cập nhật tag
  async updateTag(id, updateData) {
    // Kiểm tra xem tag có tồn tại không
    const tag = await Tag.findById(id);
    if (!tag) {
      throw new Error('Tag not found');
    }

    // Kiểm tra trùng tên nếu cập nhật tên
    if (updateData.name && updateData.name !== tag.name) {
      const existingTag = await Tag.findOne({ name: updateData.name });
      if (existingTag) {
        throw new Error('Tag with this name already exists');
      }
    }

    // Validate relatedTags if exists
    if (updateData.relatedTags && updateData.relatedTags.length > 0) {
      for (const relatedTagId of updateData.relatedTags) {
        // Không cho phép tag liên kết đến chính nó
        if (relatedTagId === id) {
          throw new Error('Tag cannot be related to itself');
        }
        
        const relatedTag = await Tag.findById(relatedTagId);
        if (!relatedTag) {
          throw new Error(`Related tag with ID ${relatedTagId} not found`);
        }
      }
    }

    const updatedTag = await Tag.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return updatedTag;
  },

  // Xóa tag
  async deleteTag(id) {
    // Kiểm tra tag tồn tại
    const tag = await Tag.findById(id);
    
    if (!tag) {
      throw new Error('Tag not found');
    }

    // Kiểm tra usageCount trước khi xóa
    if (tag.usageCount > 0) {
      throw new Error('Cannot delete tag that is being used. Deactivate it instead.');
    }

    // Xóa tag
    await Tag.findByIdAndDelete(id);
    return true;
  },

  // Import nhiều tags
  async importTags(tags) {
    // Kiểm tra tên tag trùng lặp
    const tagNames = tags.map(tag => tag.name);
    const existingTags = await Tag.find({ name: { $in: tagNames } });
    
    if (existingTags.length > 0) {
      const existingNames = existingTags.map(tag => tag.name).join(', ');
      throw new Error(`Some tags already exist: ${existingNames}`);
    }

    // Validate relatedTags
    for (const tag of tags) {
      if (tag.relatedTags && tag.relatedTags.length > 0) {
        for (const relatedTagId of tag.relatedTags) {
          const relatedTag = await Tag.findById(relatedTagId);
          if (!relatedTag) {
            throw new Error(`Related tag with ID ${relatedTagId} not found for tag: ${tag.name}`);
          }
        }
      }
    }

    const insertedTags = await Tag.insertMany(tags, {
      ordered: false
    });

    return insertedTags;
  },

  // Cập nhật usageCount của tag
  async updateUsageCount(id, increment = true) {
    const tag = await Tag.findById(id);
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    const updateValue = increment ? 1 : -1;
    
    // Đảm bảo usageCount không âm
    const newCount = Math.max(0, tag.usageCount + updateValue);
    
    await Tag.findByIdAndUpdate(id, { usageCount: newCount });
    
    return true;
  }
};

module.exports = tagService; 