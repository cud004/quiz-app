const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Tag = require('../models/Tag');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const questionService = require('./questionService');

const examService = {
  // Lấy danh sách đề thi với nhiều tiêu chí tìm kiếm
  async getExams(query) {
    const { 
      page = 1, 
      limit = 12,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      isPublished,
      createdBy,
      topic,
      tag,
      searchText,
      accessLevel,
      difficulty
    } = query;
    
    // Xây dựng filter
    const filter = {};
    
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';
    if (createdBy) filter.createdBy = createdBy;
    if (accessLevel) filter.accessLevel = accessLevel;
    if (difficulty) filter.difficulty = difficulty;
    
    // Filter theo topic nếu có
    if (topic) {
      if (mongoose.Types.ObjectId.isValid(topic)) {
        filter.topic = new ObjectId(topic);
      } else {
        // Nếu topic là tên, tìm theo tên
        const topics = await Topic.find({
          $or: [
            { name: { $regex: topic, $options: 'i' } },
            { description: { $regex: topic, $options: 'i' } }
          ]
        });
        if (topics.length > 0) {
          filter.topic = { $in: topics.map(t => t._id) };
        } else {
          filter.topic = { $in: [] };
        }
      }
    }
    
    // Filter theo tag nếu có
    if (tag) {
      filter.tags = new ObjectId(tag);
    }
    
    // Text search nếu có
    let textSearchOptions = {};
    let sortOptions = {};
    if (searchText) {
      filter.$text = { $search: searchText };
      textSearchOptions.score = { $meta: 'textScore' };
      sortOptions = { score: { $meta: 'textScore' } };
    } else {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const exams = await Exam.find(filter, textSearchOptions)
      .populate('topic', 'name category')
      .populate('tags', 'name category')
      .populate('createdBy', 'name')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Exam.countDocuments(filter);

    return {
      exams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Lấy đề thi theo ID
  async getExamById(id, includeAnswers = false) {
    const exam = await Exam.findById(id)
      .populate('topic', 'name description category')
      .populate('tags', 'name category')
      .populate('createdBy', 'name')
      .populate({
        path: 'questions.question',
        select: includeAnswers ? '' : '-correctAnswer',
        populate: [
          { path: 'tags', select: 'name' }
        ]
      });
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    return {
      exam,
      metadata: {
        totalQuestions: exam.questions.length,
        totalPoints: exam.totalPoints,
        hasCorrectAnswers: includeAnswers
      }
    };
  },

  // Tạo đề thi mới
  async createExam(examData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Kiểm tra xem tên đề thi đã tồn tại chưa
      const existingExam = await Exam.findOne({ 
        title: examData.title,
        createdBy: examData.createdBy
      });
      
      // Nếu tên đã tồn tại, thêm hậu tố để phân biệt
      if (existingExam) {
        const count = await Exam.countDocuments({
          title: new RegExp(`^${examData.title}( \(\d+\))?$`),
          createdBy: examData.createdBy
        });
        examData.title = `${examData.title} (${count + 1})`;
      }
      
      // Kiểm tra topic tồn tại
      if (examData.topic) {
        const topic = await Topic.findById(examData.topic);
        if (!topic) {
          throw new Error(`Topic with ID ${examData.topic} not found`);
        }
      }
      
      if (examData.tags && examData.tags.length > 0) {
        for (const tagId of examData.tags) {
          const tag = await Tag.findById(tagId);
          if (!tag) {
            throw new Error(`Tag with ID ${tagId} not found`);
          }
        }
      }
      
      // Kiểm tra và xử lý các câu hỏi
      if (examData.questions && examData.questions.length > 0) {
        let totalPoints = 0;
        
        // Duyệt qua từng câu hỏi để kiểm tra và tính tổng điểm
        for (let i = 0; i < examData.questions.length; i++) {
          const questionItem = examData.questions[i];
          
          // Kiểm tra câu hỏi tồn tại
          const question = await Question.findById(questionItem.question);
          if (!question) {
            throw new Error(`Question with ID ${questionItem.question} not found`);
          }
          
          // Thêm giá trị order nếu chưa có
          if (questionItem.order === undefined) {
            questionItem.order = i;
          }
          
          // Cộng dồn điểm
          totalPoints += questionItem.points;
        }
        
        // Lưu tổng điểm vào đề thi
        examData.totalPoints = totalPoints;
      }
      
      const exam = new Exam(examData);
      await exam.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return exam;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  // Cập nhật đề thi
  async updateExam(id, updateData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Kiểm tra đề thi tồn tại
      const exam = await Exam.findById(id);
      if (!exam) {
        throw new Error('Exam not found');
      }
      
      // Nếu đề thi đã publish, chỉ cho phép update một số trường nhất định
      if (exam.isPublished && updateData.questions) {
        throw new Error('Cannot modify questions of a published exam. Unpublish it first.');
      }
      
      // Kiểm tra nếu đổi tên có bị trùng không
      if (updateData.title && updateData.title !== exam.title) {
        const existingExam = await Exam.findOne({
          _id: { $ne: id },
          title: updateData.title,
          createdBy: exam.createdBy
        });
        
        if (existingExam) {
          const count = await Exam.countDocuments({
            _id: { $ne: id },
            title: new RegExp(`^${updateData.title}( \(\d+\))?$`),
            createdBy: exam.createdBy
          });
          updateData.title = `${updateData.title} (${count + 1})`;
        }
      }
      
      // Kiểm tra topic tồn tại
      if (updateData.topic) {
        const topic = await Topic.findById(updateData.topic);
        if (!topic) {
          throw new Error(`Topic with ID ${updateData.topic} not found`);
        }
      }
      
      if (updateData.tags) {
        for (const tagId of updateData.tags) {
          const tag = await Tag.findById(tagId);
          if (!tag) {
            throw new Error(`Tag with ID ${tagId} not found`);
          }
        }
      }
      
      // Kiểm tra và xử lý các câu hỏi
      if (updateData.questions) {
        let totalPoints = 0;
        
        // Duyệt qua từng câu hỏi để kiểm tra và tính tổng điểm
        for (let i = 0; i < updateData.questions.length; i++) {
          const questionItem = updateData.questions[i];
          
          // Kiểm tra câu hỏi tồn tại
          const question = await Question.findById(questionItem.question);
          if (!question) {
            throw new Error(`Question with ID ${questionItem.question} not found`);
          }
          
          // Thêm giá trị order nếu chưa có
          if (questionItem.order === undefined) {
            questionItem.order = i;
          }
          
          // Cộng dồn điểm
          totalPoints += questionItem.points;
        }
        
        // Lưu tổng điểm vào đề thi
        updateData.totalPoints = totalPoints;
      }
      
      const updatedExam = await Exam.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true, session }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      return updatedExam;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },

  // Xóa đề thi
  async deleteExam(id) {
    // Kiểm tra đề thi tồn tại
    const exam = await Exam.findById(id);
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    // Nếu đề thi đã publish và đã có người làm bài, không cho phép xóa
    if (exam.isPublished && exam.attemptCount > 0) {
      throw new Error('Cannot delete an exam that has been attempted. Unpublish it instead.');
    }
    
    // Xóa đề thi
    await Exam.findByIdAndDelete(id);
    return { success: true, message: 'Exam deleted successfully' };
  },
  
  // Publish/Unpublish đề thi
  async setPublishStatus(id, isPublished) {
    // Kiểm tra đề thi tồn tại
    const exam = await Exam.findById(id);
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    // Kiểm tra nếu đề thi đã có trạng thái như yêu cầu
    if (exam.isPublished === isPublished) {
      return { exam, message: `Exam is already ${isPublished ? 'published' : 'unpublished'}` };
    }
    
    // Nếu unpublish đề thi đã có người làm bài, cần cảnh báo
    if (!isPublished && exam.attemptCount > 0) {
      // Vẫn cho phép unpublish nhưng cảnh báo
      const updatedExam = await Exam.findByIdAndUpdate(
        id,
        { isPublished },
        { new: true }
      );
      
      return { 
        exam: updatedExam, 
        message: 'Exam unpublished successfully, but note that it has existing attempts',
        warning: true
      };
    }
    
    // Cập nhật trạng thái publish
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { isPublished },
      { new: true }
    );
    
    return { 
      exam: updatedExam, 
      message: `Exam ${isPublished ? 'published' : 'unpublished'} successfully` 
    };
  },
  
  // Tạo đề thi ngẫu nhiên
  async generateRandomExam(options) {
    const {
      title,
      description,
      questionCount,
      topic,
      tags = [],
      difficulty,
      difficultyDistribution,
      pointsDistribution = 'equal',
      timeLimit,
      accessLevel = 'free',
      createdBy
    } = options;
    
    // Validate inputs
    if (!questionCount || questionCount < 1) {
      throw new Error('Question count must be at least 1');
    }
    
    if (!createdBy) {
      throw new Error('Creator ID is required');
    }
    
    // Đếm số lượng câu hỏi khả dụng cho chủ đề
    const questionStats = await questionService.countQuestionsByTopic(topic);
    
    if (questionStats.total < questionCount) {
      throw new Error(`Not enough questions available. Requested ${questionCount}, but only ${questionStats.total} found for the selected topic.`);
    }
    
    // Cung cấp thông tin chi tiết về số lượng câu hỏi khả dụng
    const availabilityInfo = {
      total: questionStats.total,
      byDifficulty: questionStats.byDifficulty,
      byTopic: questionStats.byTopic
    };
    
    // Xây dựng query tìm câu hỏi
    const filter = {
      isActive: true
    };
    
    if (topic) {
      filter.topic = new ObjectId(topic);
    }
    
    if (tags && tags.length > 0) {
      const tagIds = tags.map(id => new ObjectId(id));
      filter.tags = { $in: tagIds };
    }
    
    let questions = [];
    let difficultyBreakdown = null;
    
    // Kiểm tra nếu có yêu cầu phân phối độ khó
    if (difficultyDistribution) {
      // Tính toán số lượng câu hỏi cho mỗi độ khó
      const totalQuestions = parseInt(questionCount);
      const questionsByDifficulty = {
        easy: Math.round((difficultyDistribution.easy || 0) * totalQuestions / 100),
        medium: Math.round((difficultyDistribution.medium || 0) * totalQuestions / 100),
        hard: Math.round((difficultyDistribution.hard || 0) * totalQuestions / 100)
      };
      
      // Lưu lại thông tin phân phối để hiển thị
      difficultyBreakdown = { ...questionsByDifficulty };
      
      // Đảm bảo tổng số câu hỏi đúng bằng questionCount
      let sum = questionsByDifficulty.easy + questionsByDifficulty.medium + questionsByDifficulty.hard;
      if (sum < totalQuestions) {
        // Nếu thiếu, thêm vào độ khó trung bình
        questionsByDifficulty.medium += (totalQuestions - sum);
      } else if (sum > totalQuestions) {
        // Nếu thừa, giảm từ độ khó dễ trước
        const diff = sum - totalQuestions;
        if (questionsByDifficulty.easy >= diff) {
          questionsByDifficulty.easy -= diff;
        } else {
          const remainingDiff = diff - questionsByDifficulty.easy;
          questionsByDifficulty.easy = 0;
          questionsByDifficulty.medium -= remainingDiff;
        }
      }
      
      // Kiểm tra số lượng câu hỏi khả dụng cho mỗi độ khó
      for (const [difficulty, count] of Object.entries(questionsByDifficulty)) {
        if (count > 0) {
          const availableCount = questionStats.byDifficulty[difficulty];
          
          if (availableCount < count) {
            throw new Error(`Not enough ${difficulty} questions. Requested ${count}, but only ${availableCount} available.`);
          }
        }
      }
      
      // Lấy câu hỏi theo từng độ khó
      let allQuestions = [];
      
      if (questionsByDifficulty.easy > 0) {
        const easyQuestions = await Question.aggregate([
          { $match: { ...filter, difficulty: 'easy' } },
          { $sample: { size: questionsByDifficulty.easy } }
        ]);
        allQuestions = [...allQuestions, ...easyQuestions];
      }
      
      if (questionsByDifficulty.medium > 0) {
        const mediumQuestions = await Question.aggregate([
          { $match: { ...filter, difficulty: 'medium' } },
          { $sample: { size: questionsByDifficulty.medium } }
        ]);
        allQuestions = [...allQuestions, ...mediumQuestions];
      }
      
      if (questionsByDifficulty.hard > 0) {
        const hardQuestions = await Question.aggregate([
          { $match: { ...filter, difficulty: 'hard' } },
          { $sample: { size: questionsByDifficulty.hard } }
        ]);
        allQuestions = [...allQuestions, ...hardQuestions];
      }
      
      // Xáo trộn câu hỏi để không bị nhóm theo độ khó
      questions = this.shuffleArray(allQuestions);
      
    } else if (difficulty) {
      // Nếu chỉ định một độ khó cụ thể
      filter.difficulty = difficulty;
      
      // Đếm số lượng câu hỏi thỏa mãn điều kiện
      const availableQuestionCount = questionStats.byDifficulty[difficulty];
      
      if (availableQuestionCount < questionCount) {
        throw new Error(`Not enough ${difficulty} questions found. Requested ${questionCount}, but only ${availableQuestionCount} available.`);
      }
      
      // Lấy câu hỏi ngẫu nhiên
      questions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: parseInt(questionCount) } }
      ]);
    } else {
      // Không chỉ định độ khó, lấy câu hỏi bất kỳ độ khó nào
      // Lấy câu hỏi ngẫu nhiên
      questions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: parseInt(questionCount) } }
      ]);
    }
    
    // Tạo tên đề thi nếu không được cung cấp
    let examTitle = title;
    if (!examTitle) {
      // Nếu có một topic duy nhất, sử dụng tên topic
      if (topic) {
        const topic = await Topic.findById(topic);
        if (topic) {
          examTitle = `${topic.name} Exam`;
        }
      } else {
        examTitle = `Random Exam`;
      }
      
      // Thêm ngày tạo
      examTitle = `${examTitle} - ${new Date().toLocaleDateString()}`;
    }
    
    // Kiểm tra tên đã tồn tại chưa
    const existingExam = await Exam.findOne({ 
      title: examTitle,
      createdBy: createdBy
    });
    
    // Nếu tên đã tồn tại, thêm hậu tố để phân biệt
    if (existingExam) {
      const count = await Exam.countDocuments({
        title: new RegExp(`^${examTitle}( \(\d+\))?$`),
        createdBy: createdBy
      });
      examTitle = `${examTitle} (${count + 1})`;
    }
    
    // Tạo mô tả nếu không được cung cấp
    let examDescription = description;
    if (!examDescription) {
      examDescription = `Randomly generated exam with ${questionCount} questions`;
      
      // Thêm thông tin về độ khó
      if (difficultyDistribution) {
        const { easy = 0, medium = 0, hard = 0 } = difficultyDistribution;
        examDescription += ` (${easy}% easy, ${medium}% medium, ${hard}% hard)`;
      } else if (difficulty) {
        examDescription += ` of ${difficulty} difficulty`;
      } else {
        examDescription += ` of mixed difficulty`;
      }
      
      // Thêm thông tin về topic
      if (topic) {
        const topicName = await Topic.findById(topic, 'name');
        if (topicName.length > 0) {
          examDescription += ` on topic: ${topicName[0].name}`;
        }
      }
    }
    
    // Tạo đề thi với các câu hỏi ngẫu nhiên
    const examQuestions = questions.map((question, index) => {
      // Tính điểm dựa theo phương thức phân phối điểm
      let points = 1;
      if (pointsDistribution === 'byDifficulty') {
        points = question.difficulty === 'easy' ? 1 : 
                question.difficulty === 'medium' ? 2 : 3;
      }
      
      return {
        question: question._id,
        points,
        order: index
      };
    });
    
    // Tự động tính thời gian dựa trên số câu hỏi nếu không được cung cấp
    const suggestedTimeLimit = timeLimit || Math.min(Math.max(questionCount, 10), 180);
    
    // Tạo đề thi
    const examData = {
      title: examTitle,
      description: examDescription,
      timeLimit: suggestedTimeLimit,
      questions: examQuestions,
      topic: topic || null,
      tags: tags || [],
      accessLevel,
      createdBy,
      randomizeQuestions: true // Mặc định bật tính năng xáo trộn câu hỏi
    };
    
    const exam = await this.createExam(examData);
    
    // Chỉ trả về đề thi, không bao gồm thống kê chi tiết
    return {
      exam
    };
  },
  
  // Phương thức hỗ trợ xáo trộn mảng
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },
  
  // Cập nhật số lượt làm bài
  async incrementAttemptCount(id) {
    const exam = await Exam.findById(id);
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    await Exam.findByIdAndUpdate(id, { $inc: { attemptCount: 1 } });
    return true;
  },
  
  // Sao chép đề thi
  async duplicateExam(id, createdBy) {
    // Lấy đề thi gốc
    const originalExam = await Exam.findById(id);
    if (!originalExam) {
      throw new Error('Exam not found');
    }
    
    // Chuẩn bị dữ liệu cho đề thi mới
    const examData = originalExam.toObject();
    
    // Loại bỏ các trường không cần sao chép
    delete examData._id;
    delete examData.createdAt;
    delete examData.updatedAt;
    delete examData.isPublished;
    delete examData.attemptCount;
    delete examData.__v;
    
    // Cập nhật người tạo mới
    examData.createdBy = createdBy;
    
    // Tạo tên mới
    examData.title = `Copy of ${originalExam.title}`;
    
    // Kiểm tra tên đã tồn tại chưa
    const existingExam = await Exam.findOne({ 
      title: examData.title,
      createdBy
    });
    
    // Nếu tên đã tồn tại, thêm hậu tố để phân biệt
    if (existingExam) {
      const count = await Exam.countDocuments({
        title: new RegExp(`^Copy of ${originalExam.title}( \(\d+\))?$`),
        createdBy
      });
      examData.title = `Copy of ${originalExam.title} (${count + 1})`;
    }
    
    // Tạo đề thi mới
    return await this.createExam(examData);
  },
  
  // Cập nhật thống kê đề thi
  async updateExamStats(id, stats) {
    const { 
      totalAttempts, 
      completionRate, 
      averageScore, 
      passRate 
    } = stats;
    
    const exam = await Exam.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    const updateData = { stats: {} };
    
    if (totalAttempts !== undefined) {
      updateData.stats.totalAttempts = totalAttempts;
    }
    
    if (completionRate !== undefined) {
      updateData.stats.completionRate = completionRate;
    }
    
    if (averageScore !== undefined) {
      updateData.stats.averageScore = averageScore;
    }
    
    if (passRate !== undefined) {
      updateData.stats.passRate = passRate;
    }
    
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    return updatedExam;
  },

  // Lấy thống kê chi tiết của đề thi
  async getExamStats(id) {
    const exam = await Exam.findById(id)
      .populate('createdBy', 'name')
      .select('title stats questions attemptCount isPublished createdAt updatedAt');
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    // Lấy số lượng câu hỏi theo độ khó (cần populate để biết độ khó)
    const fullExam = await Exam.findById(id).populate({
      path: 'questions.question',
      select: 'difficulty stats'
    });
    
    // Phân loại câu hỏi theo độ khó
    const difficultyCount = {
      easy: 0,
      medium: 0,
      hard: 0
    };
    
    // Thống kê điểm trung bình cho từng độ khó
    const difficultyStats = {
      easy: { correctRate: 0, count: 0 },
      medium: { correctRate: 0, count: 0 },
      hard: { correctRate: 0, count: 0 }
    };
    
    // Tính toán thống kê chi tiết
    let totalCorrectRate = 0;
    let totalQuestions = 0;
    let totalPoints = 0;
    
    fullExam.questions.forEach(item => {
      if (item.question) {
        const difficulty = item.question.difficulty || 'medium';
        difficultyCount[difficulty]++;
        totalPoints += item.points;
        
        // Nếu câu hỏi đã có thống kê
        if (item.question.stats && item.question.stats.totalAttempts > 0) {
          difficultyStats[difficulty].correctRate += item.question.stats.correctRate || 0;
          difficultyStats[difficulty].count++;
          totalCorrectRate += item.question.stats.correctRate || 0;
          totalQuestions++;
        }
      }
    });
    
    // Tính trung bình cho từng độ khó
    Object.keys(difficultyStats).forEach(difficulty => {
      if (difficultyStats[difficulty].count > 0) {
        difficultyStats[difficulty].correctRate = 
          difficultyStats[difficulty].correctRate / difficultyStats[difficulty].count;
      }
    });
    
    // Tính trung bình tổng
    const averageCorrectRate = totalQuestions > 0 ? totalCorrectRate / totalQuestions : 0;
    
    // Tìm câu hỏi khó nhất và dễ nhất
    let hardestQuestion = null;
    let easiestQuestion = null;
    let lowestCorrectRate = 1;
    let highestCorrectRate = 0;
    
    fullExam.questions.forEach(item => {
      if (item.question && item.question.stats && item.question.stats.totalAttempts > 3) {
        const correctRate = item.question.stats.correctRate || 0;
        
        if (correctRate < lowestCorrectRate) {
          lowestCorrectRate = correctRate;
          hardestQuestion = {
            id: item.question._id,
            correctRate: correctRate,
            difficulty: item.question.difficulty,
            points: item.points
          };
        }
        
        if (correctRate > highestCorrectRate) {
          highestCorrectRate = correctRate;
          easiestQuestion = {
            id: item.question._id,
            correctRate: correctRate,
            difficulty: item.question.difficulty,
            points: item.points
          };
        }
      }
    });
    
    // Tổng hợp thống kê
    const detailedStats = {
      basic: {
        title: exam.title,
        questionCount: exam.questions.length,
        totalPoints: totalPoints,
        attemptCount: exam.attemptCount || 0,
        isPublished: exam.isPublished,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
        createdBy: exam.createdBy
      },
      distribution: {
        byDifficulty: difficultyCount
      },
      performance: {
        averageScore: exam.stats.averageScore || 0,
        passRate: exam.stats.passRate || 0,
        completionRate: exam.stats.completionRate || 0,
        byDifficulty: difficultyStats,
        averageCorrectRate: averageCorrectRate,
        hardestQuestion: hardestQuestion,
        easiestQuestion: easiestQuestion
      }
    };
    
    return detailedStats;
  }
};

module.exports = examService; 