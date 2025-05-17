const Question = require('../../models/Question');
const Topic = require('../../models/Topic');
const Tag = require('../../models/Tag');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { generateExplanation } = require('../ai/geminiService');

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
      filter.topics = new ObjectId(topic);
    }
    
    // Filter theo tag nếu có
    if (tag) {
      filter.tags = new ObjectId(tag);
    }
    
    // Text search nếu có
    let textSearchOptions = {};
    if (searchText) {
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
      .populate('topics', 'name category')
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
      .populate('topics', 'name description category')
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
    
    // Thêm điều kiện tìm cùng topics
    if (question.topics && question.topics.length > 0) {
      const topicIds = question.topics.map(topic => topic._id);
      relatedQuestionsFilter.$or.push({ topics: { $in: topicIds } });
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
        .populate('topics', 'name')
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
    // Kiểm tra các topic và tag tồn tại
    if (questionData.topics && questionData.topics.length > 0) {
      for (const topicId of questionData.topics) {
        const topic = await Topic.findById(topicId);
        if (!topic) {
          throw new Error(`Topic with ID ${topicId} not found`);
        }
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
    
    // Kiểm tra các topic và tag tồn tại nếu được cập nhật
    if (updateData.topics) {
      for (const topicId of updateData.topics) {
        const topic = await Topic.findById(topicId);
        if (!topic) {
          throw new Error(`Topic with ID ${topicId} not found`);
        }
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
      if (question.tags && question.tags.length > 0) {
        const removedTags = question.tags.filter(oldTag => 
          !updateData.tags.some(newTag => newTag.toString() === oldTag.toString())
        );
        
        for (const tagId of removedTags) {
          await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } });
        }
      }
      
      // Tăng usageCount cho các tag mới
      const newTags = updateData.tags.filter(newTag => 
        !question.tags.some(oldTag => oldTag.toString() === newTag.toString())
      );
      
      for (const tagId of newTags) {
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: 1 } });
      }
    }
    
    // Kiểm tra correctAnswer nếu được cập nhật
    if (updateData.correctAnswer || updateData.options) {
      const options = updateData.options || question.options;
      const correctLabel = updateData.correctAnswer || question.correctAnswer;
      
      const hasCorrectOption = options.some(option => option.label === correctLabel);
      
      if (!hasCorrectOption) {
        throw new Error('Correct answer must match one of the option labels');
      }
    }

    // Nếu updateData.explanation rỗng hoặc không có, tự động sinh lại giải thích
    if ((updateData.explanation === undefined || updateData.explanation.trim() === '') && (updateData.content || updateData.options || updateData.correctAnswer)) {
      // Lấy lại dữ liệu mới nhất để sinh giải thích
      const q = await Question.findById(id);
      const content = updateData.content || q.content;
      const options = updateData.options || q.options;
      const correctAnswer = updateData.correctAnswer || q.correctAnswer;
      updateData.explanation = await generateExplanation(content, options, correctAnswer);
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return updatedQuestion;
  },

  // Xóa câu hỏi
  async deleteQuestion(id) {
    // Kiểm tra câu hỏi tồn tại
    const question = await Question.findById(id);
    
    if (!question) {
      throw new Error('Question not found');
    }

    // Kiểm tra usageCount trước khi xóa
    if (question.usageCount > 0) {
      throw new Error('Cannot delete question that is being used in exams. Deactivate it instead.');
    }
    
    // Giảm usageCount cho các tag
    if (question.tags && question.tags.length > 0) {
      for (const tagId of question.tags) {
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: -1 } });
      }
    }

    // Xóa câu hỏi
    await Question.findByIdAndDelete(id);
    return true;
  },

  // Import nhiều câu hỏi
  async importQuestions(questionsData, createdBy) {
    // Xác thực và chuẩn bị dữ liệu
    const questionsToInsert = [];
    
    for (const questionData of questionsData) {
      // Kiểm tra các topic tồn tại
      if (questionData.topics && questionData.topics.length > 0) {
        for (const topicId of questionData.topics) {
          const topic = await Topic.findById(topicId);
          if (!topic) {
            throw new Error(`Topic with ID ${topicId} not found for question: ${questionData.content}`);
          }
        }
      }
      
      // Kiểm tra các tag tồn tại
      if (questionData.tags && questionData.tags.length > 0) {
        for (const tagId of questionData.tags) {
          const tag = await Tag.findById(tagId);
          if (!tag) {
            throw new Error(`Tag with ID ${tagId} not found for question: ${questionData.content}`);
          }
        }
      }
      
      // Kiểm tra correctAnswer có trong options không
      const correctLabel = questionData.correctAnswer;
      const hasCorrectOption = questionData.options.some(option => option.label === correctLabel);
      
      if (!hasCorrectOption) {
        throw new Error(`Correct answer must match one of the option labels for question: ${questionData.content}`);
      }
      
      // Thêm createdBy
      questionData.createdBy = createdBy;
      
      questionsToInsert.push(questionData);
    }
    
    // Import questions
    const insertedQuestions = await Question.insertMany(questionsToInsert);
    
    // Cập nhật usageCount cho các tag
    const allTagIds = new Set();
    for (const question of questionsData) {
      if (question.tags && question.tags.length > 0) {
        for (const tagId of question.tags) {
          allTagIds.add(tagId.toString());
        }
      }
    }
    
    // Tăng usageCount cho mỗi tag đã sử dụng
    for (const tagId of allTagIds) {
      // Đếm số lần tag được sử dụng trong các câu hỏi mới
      const tagCount = questionsData.reduce((count, question) => {
        if (question.tags && question.tags.includes(tagId)) {
          return count + 1;
        }
        return count;
      }, 0);
      
      if (tagCount > 0) {
        await Tag.findByIdAndUpdate(tagId, { $inc: { usageCount: tagCount } });
      }
    }

    return insertedQuestions;
  },

  // Cập nhật thống kê câu hỏi
  async updateQuestionStats(id, isCorrect, timeSpent) {
    const question = await Question.findById(id);
    
    if (!question) {
      throw new Error('Question not found');
    }
    
    // Tính toán các giá trị mới
    const totalAttempts = question.stats.totalAttempts + 1;
    const correctCount = isCorrect 
      ? (question.stats.correctRate * question.stats.totalAttempts) + 1 
      : (question.stats.correctRate * question.stats.totalAttempts);
    const correctRate = correctCount / totalAttempts;
    
    // Tính toán thời gian trung bình mới
    const currentTotalTime = question.stats.averageTimeSpent * question.stats.totalAttempts;
    const newAverageTime = (currentTotalTime + timeSpent) / totalAttempts;
    
    // Cập nhật thống kê
    await Question.findByIdAndUpdate(id, {
      'stats.totalAttempts': totalAttempts,
      'stats.correctRate': correctRate,
      'stats.averageTimeSpent': newAverageTime,
      $inc: { usageCount: 1 }
    });
    
    return true;
  },

  // Đếm số câu hỏi theo chủ đề và độ khó
  async countQuestionsByTopicAndDifficulty(topicId, isActiveOnly = true) {
    const filter = {};
    
    if (topicId) {
      filter.topics = new ObjectId(topicId);
    }
    
    if (isActiveOnly) {
      filter.isActive = true;
    }
    
    // Đếm tổng số câu hỏi
    const totalCount = await Question.countDocuments(filter);
    
    // Đếm số câu hỏi theo độ khó
    const easyCount = await Question.countDocuments({
      ...filter,
      difficulty: 'easy'
    });
    
    const mediumCount = await Question.countDocuments({
      ...filter,
      difficulty: 'medium'
    });
    
    const hardCount = await Question.countDocuments({
      ...filter,
      difficulty: 'hard'
    });
    
    return {
      total: totalCount,
      byDifficulty: {
        easy: easyCount,
        medium: mediumCount,
        hard: hardCount
      }
    };
  },
  
  // Đếm số câu hỏi theo nhiều chủ đề
  async countQuestionsByTopics(topicIds, isActiveOnly = true) {
    if (!topicIds || !topicIds.length) {
      return {
        total: 0,
        byTopic: {},
        byDifficulty: { easy: 0, medium: 0, hard: 0 }
      };
    }
    
    const result = {
      total: 0,
      byTopic: {},
      byDifficulty: { easy: 0, medium: 0, hard: 0 }
    };
    
    // Chuyển đổi chuỗi ID thành ObjectId
    const objectIdTopics = topicIds.map(id => new ObjectId(id));
    
    // Lấy tên của các topic
    const topics = await Topic.find({ _id: { $in: objectIdTopics } }, 'name');
    const topicNames = {};
    topics.forEach(topic => {
      topicNames[topic._id.toString()] = topic.name;
    });
    
    // Đếm tổng số câu hỏi cho tất cả các topic được chọn
    const baseFilter = isActiveOnly ? { isActive: true } : {};
    const totalFilter = {
      ...baseFilter,
      topics: { $in: objectIdTopics }
    };
    
    result.total = await Question.countDocuments(totalFilter);
    
    // Đếm theo độ khó cho tất cả các topic
    result.byDifficulty.easy = await Question.countDocuments({
      ...totalFilter,
      difficulty: 'easy'
    });
    
    result.byDifficulty.medium = await Question.countDocuments({
      ...totalFilter,
      difficulty: 'medium'
    });
    
    result.byDifficulty.hard = await Question.countDocuments({
      ...totalFilter,
      difficulty: 'hard'
    });
    
    // Đếm số câu hỏi cho từng topic riêng biệt
    for (const topicId of topicIds) {
      const topicStats = await this.countQuestionsByTopicAndDifficulty(topicId, isActiveOnly);
      const topicName = topicNames[topicId] || `Topic ${topicId}`;
      
      result.byTopic[topicId] = {
        name: topicName,
        count: topicStats.total,
        byDifficulty: topicStats.byDifficulty
      };
    }
    
    return result;
  }
};

module.exports = questionService; 