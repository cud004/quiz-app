const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Tag = require('../models/Tag');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { generateExplanation } = require('./geminiService');

const questionService = {
  // Lấy danh sách questions với nhiều tiêu chí tìm kiếm
  async getQuestions(query) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      difficulty,
      topic,
      tag,
      createdBy,
      isActive,
      searchText
    } = query;
    
    // Xây dựng filter
    const filter = {};
    
    if (difficulty) filter.difficulty = difficulty;
    if (createdBy) filter.createdBy = createdBy;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    // Filter theo topic nếu có
    if (topic) {
      if (Array.isArray(topic)) {
        filter.topic = { $in: topic.map(id => new ObjectId(id)) };
      } else {
        filter.topic = new ObjectId(topic);
      }
    }
    
    // Filter theo tag nếu có
    if (tag) {
      if (Array.isArray(tag)) {
        filter.tags = { $in: tag.map(id => new ObjectId(id)) };
      } else {
        filter.tags = new ObjectId(tag);
      }
    }
    
    // Text search nếu có
    let textSearchOptions = {};
    if (searchText) {
      // Mở rộng $text index: cần tạo index ở model Question như sau:
      // QuestionSchema.index({ content: 'text', 'options.text': 'text', correctAnswer: 'text' });
      filter.$text = { $search: searchText };
      textSearchOptions.score = { $meta: 'textScore' };
    }
    
    // Xác định cách sắp xếp
    let sortOptions = {};
    if (searchText) {
      // Nếu đang text search, ưu tiên sắp xếp theo độ phù hợp
      sortOptions = { score: { $meta: 'textScore' } };
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }
    
    const questions = await Question.find(filter, textSearchOptions)
      .populate('topic', 'name category')
      .populate('tags', 'name category')
      .populate('createdBy', 'name')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments(filter);

    return {
      questions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Lấy câu hỏi theo ID
  async getQuestionById(id, includeCorrectAnswer = false) {
    // Xác định các trường cần loại bỏ nếu không hiển thị đáp án
    const projection = includeCorrectAnswer ? {} : { correctAnswer: 0 };
    
    const question = await Question.findById(id, projection)
      .populate('topic', 'name description category')
      .populate('tags', 'name category')
      .populate('createdBy', 'name');
    
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Tìm các câu hỏi liên quan (cùng topic hoặc cùng tag)
    const relatedQuestionsFilter = {
      _id: { $ne: id },
      isActive: true,
      $or: []
    };
    
    // Thêm điều kiện tìm cùng topic
    if (question.topic) {
      relatedQuestionsFilter.$or.push({ topic: question.topic._id });
    }
    
    // Thêm điều kiện tìm cùng tags
    if (question.tags && question.tags.length > 0) {
      const tagIds = question.tags.map(tag => tag._id);
      relatedQuestionsFilter.$or.push({ tags: { $in: tagIds } });
    }
    
    // Chỉ tìm related questions nếu có điều kiện
    let relatedQuestions = [];
    if (relatedQuestionsFilter.$or.length > 0) {
      relatedQuestions = await Question.find(relatedQuestionsFilter, { correctAnswer: 0 })
        .populate('topic', 'name')
        .populate('tags', 'name')
        .limit(5);
    }
    
    return {
      question,
      relatedQuestions
    };
  },

  // Tạo câu hỏi mới
  async createQuestion(questionData) {
    // Kiểm tra topic tồn tại
    if (questionData.topic) {
      const topic = await Topic.findById(questionData.topic);
      if (!topic) {
        throw new Error(`Topic with ID ${questionData.topic} not found`);
      }
    }
    
    if (questionData.tags && questionData.tags.length > 0) {
      for (const tagId of questionData.tags) {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          throw new Error(`Tag with ID ${tagId} not found`);
        }
        
        // Cập nhật usageCount cho tag
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: 1 } });
      }
    }
    
    // Kiểm tra correctAnswer có trong options không
    const correctLabel = questionData.correctAnswer;
    const hasCorrectOption = questionData.options.some(option => option.label === correctLabel);
    
    if (!hasCorrectOption) {
      throw new Error('Correct answer must match one of the option labels');
    }

    const question = new Question(questionData);
    // Nếu chưa có giải thích, tự động sinh bằng Gemini
    if (!question.explanation || question.explanation.trim() === '') {
      question.explanation = await generateExplanation(
        question.content,
        question.options,
        question.correctAnswer
      );
    }
    await question.save();
    
    return question;
  },

  // Cập nhật câu hỏi
  async updateQuestion(id, updateData) {
    // Kiểm tra câu hỏi tồn tại
    const question = await Question.findById(id);
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Kiểm tra topic tồn tại nếu được cập nhật
    if (updateData.topic) {
      const topic = await Topic.findById(updateData.topic);
      if (!topic) {
        throw new Error(`Topic with ID ${updateData.topic} not found`);
      }
    }
    
    // Xử lý cập nhật tags
    if (updateData.tags) {
      // Kiểm tra tag mới tồn tại
      for (const tagId of updateData.tags) {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          throw new Error(`Tag with ID ${tagId} not found`);
        }
      }
      
      // Giảm usageCount cho các tag bị xóa
      const removedTags = question.tags.filter(tag => !updateData.tags.includes(tag.toString()));
      for (const tagId of removedTags) {
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } });
      }
      
      // Tăng usageCount cho các tag mới
      const newTags = updateData.tags.filter(tag => !question.tags.includes(tag));
      for (const tagId of newTags) {
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: 1 } });
      }
    }
    
    // Kiểm tra correctAnswer có trong options không nếu được cập nhật
    if (updateData.correctAnswer) {
      const options = updateData.options || question.options;
      const hasCorrectOption = options.some(option => option.label === updateData.correctAnswer);
      
      if (!hasCorrectOption) {
        throw new Error('Correct answer must match one of the option labels');
      }
    }
    
    // Cập nhật câu hỏi
    Object.assign(question, updateData);
    
    // Nếu chưa có giải thích, tự động sinh bằng Gemini
    if (!question.explanation || question.explanation.trim() === '') {
      question.explanation = await generateExplanation(
        question.content,
        question.options,
        question.correctAnswer
      );
    }
    
    await question.save();
    return question;
  },

  // Xóa câu hỏi
  async deleteQuestion(id) {
    const question = await Question.findById(id);
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Giảm usageCount cho các tag
    if (question.tags && question.tags.length > 0) {
      for (const tagId of question.tags) {
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } });
      }
    }
    
    await Question.findByIdAndDelete(id);
    return { message: 'Question deleted successfully' };
  },

  // Import nhiều câu hỏi
  async importQuestions(questionsData, createdBy) {
    const results = {
      total: questionsData.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    for (const questionData of questionsData) {
      try {
        // Kiểm tra topic tồn tại
        if (questionData.topic) {
          const topic = await Topic.findById(questionData.topic);
          if (!topic) {
            throw new Error(`Topic with ID ${questionData.topic} not found`);
          }
        }
        // Kiểm tra tags tồn tại
        if (questionData.tags && questionData.tags.length > 0) {
          for (const tagId of questionData.tags) {
            const tag = await Tag.findById(tagId);
            if (!tag) {
              throw new Error(`Tag with ID ${tagId} not found`);
            }
          }
        }
        // Kiểm tra trùng lặp nội dung (content + topic)
        const duplicate = await Question.findOne({
          content: questionData.content,
          topic: questionData.topic
        });
        if (duplicate) {
          // Nếu trùng lặp thì bỏ qua, không tính là lỗi
          results.skipped++;
          continue;
        }
        // Kiểm tra correctAnswer có trong options không
        const correctLabel = questionData.correctAnswer;
        const hasCorrectOption = questionData.options.some(option => option.label === correctLabel);
        if (!hasCorrectOption) {
          throw new Error('Correct answer must match one of the option labels');
        }
        // Tạo câu hỏi mới
        const question = new Question({
          ...questionData,
          createdBy
        });
        await question.save();
        // Tăng usageCount cho các tag
        if (question.tags && question.tags.length > 0) {
          for (const tagId of question.tags) {
            await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: 1 } });
          }
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          question: questionData.content,
          error: error.message
        });
      }
    }
    return results;
  },

  // Cập nhật thống kê câu hỏi
  async updateQuestionStats(id, isCorrect, timeSpent) {
    const question = await Question.findById(id);
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Cập nhật thống kê
    question.stats.totalAttempts++;
    question.stats.totalTimeSpent += timeSpent;
    
    if (isCorrect) {
      question.stats.correctAttempts++;
    } else {
      question.stats.incorrectAttempts++;
    }
    
    // Tính toán độ khó
    const difficulty = question.stats.totalAttempts > 0
      ? (question.stats.correctAttempts / question.stats.totalAttempts) * 100
      : 0;
    
    question.stats.difficulty = difficulty;
    
    await question.save();
    return question;
  },

  // Đếm số câu hỏi theo topic và độ khó
  async countQuestionsByTopicAndDifficulty(topicId, isActiveOnly = true) {
    const filter = {
      topic: topicId
    };
    
    if (isActiveOnly) {
      filter.isActive = true;
    }
    
    const counts = await Question.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      easy: 0,
      medium: 0,
      hard: 0
    };
    
    counts.forEach(item => {
      if (item._id in result) {
        result[item._id] = item.count;
      }
    });
    
    return result;
  },

  // Đếm số câu hỏi theo topic
  async countQuestionsByTopic(topicId, isActiveOnly = true) {
    const filter = {
      topic: topicId
    };
    
    if (isActiveOnly) {
      filter.isActive = true;
    }
    
    return Question.countDocuments(filter);
  }
};

module.exports = questionService;