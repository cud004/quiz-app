const QuizAttempt = require('../models/QuizAttempt');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Tag = require('../models/Tag');


// Tạo một lần làm bài kiểm tra
exports.createQuizAttempt = async ({ userId, examId, answers, timeTaken }) => {
    let score = 0;
    const topicPerformance = {};
    const tagPerformance = {};

    for (const answer of answers) {
        const question = await Question.findById(answer.question);
        if (!question) {
            throw new Error(`Question with ID ${answer.question} not found`);
        }

        // Kiểm tra nếu chỉ số `selectedOption` hợp lệ
        if (answer.selectedOption < 0 || answer.selectedOption >= question.options.length) {
            throw new Error(`Selected option index ${answer.selectedOption} is out of bounds for question ${answer.question}`);
        }

        // Lấy option được chọn dựa trên chỉ số
        const selectedOption = question.options[answer.selectedOption];

        // Kiểm tra câu trả lời đúng
        const isCorrect = selectedOption.isCorrect === true;
        if (isCorrect) {
            score += 1;
        }

        // Cập nhật hiệu suất theo topic
        const topicId = question.topic.toString();
        if (!topicPerformance[topicId]) {
            topicPerformance[topicId] = { correctCount: 0, totalCount: 0 };
        }
        topicPerformance[topicId].totalCount += 1;
        if (isCorrect) {
            topicPerformance[topicId].correctCount += 1;
        }

        // Cập nhật hiệu suất theo tag
        if (question.tags && question.tags.length > 0) {
            for (const tag of question.tags) {
                const tagId = tag._id.toString();
                if (!tagPerformance[tagId]) {
                    tagPerformance[tagId] = { correctCount: 0, totalCount: 0 };
                }
                tagPerformance[tagId].totalCount += 1;
                if (isCorrect) {
                    tagPerformance[tagId].correctCount += 1;
                }
            }
        }

        // Ghi lại trạng thái đúng/sai và nội dung của `selectedOption`
        answer.isCorrect = isCorrect;
        answer.selectedOptionText = selectedOption.text;
    }

    // Chuyển đổi hiệu suất theo topic thành mảng và thêm tên chủ đề
    const topicPerformanceArray = await Promise.all(
        Object.keys(topicPerformance).map(async (topicId) => {
            const topic = await Topic.findById(topicId);
            return {
                topic: topicId,
                topicName: topic ? topic.name : 'Unknown Topic', // Thêm tên chủ đề
                correctCount: topicPerformance[topicId].correctCount,
                totalCount: topicPerformance[topicId].totalCount,
            };
        })
    );

    // Chuyển đổi hiệu suất theo tag thành mảng và thêm tên tag
    const tagPerformanceArray = await Promise.all(
        Object.keys(tagPerformance).map(async (tagId) => {
            const tag = await Tag.findById(tagId);
            return {
                tag: tagId,
                tagName: tag ? tag.name : 'Unknown Tag', // Thêm tên tag
                correctCount: tagPerformance[tagId].correctCount,
                totalCount: tagPerformance[tagId].totalCount,
            };
        })
    );

    // Tạo QuizAttempt
    const quizAttempt = new QuizAttempt({
        user: userId,
        exam: examId,
        answers,
        score,
        totalQuestions: answers.length,
        timeTaken,
        topicPerformance: topicPerformanceArray,
        completed: true,
        tagPerformance: tagPerformanceArray,
        endTime: new Date(),
        status: 'completed'
    });

    await quizAttempt.save();
    return quizAttempt;
};

// Lấy danh sách các lần làm bài kiểm tra của một người dùng
exports.getQuizAttemptsByUser = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return await QuizAttempt.find({ user: userId })
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'exam',
            select: 'title description',
        })
        .populate({
            path: 'answers.question',
            select: 'content options explanation',
        });
};

// Lấy chi tiết một lần làm bài kiểm tra
exports.getQuizAttemptById = async (attemptId) => {
    const quizAttempt = await QuizAttempt.findById(attemptId)
        .populate('user', 'name email') // Thêm thông tin người dùng
        .populate({
            path: 'exam',
            select: 'title description questions',
        })
        .populate({
            path: 'answers.question',
            select: 'content options explanation',
        })
        .populate({
            path: 'topicPerformance.topic',
            select: 'name',
        })
        .populate({
            path: 'tagPerformance.tag',
            select: 'name',
        });

    if (!quizAttempt) {
        throw new Error('QuizAttempt not found');
    }

    return quizAttempt;
};