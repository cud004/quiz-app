const { suggestionService } = require("../services/suggestionService");
const ApiResponse = require("../utils/apiResponse");
const UserTagStats = require("../models/UserTagStats");
const Tag = require("../models/Tag");
const Topic = require("../models/Topic");

const suggestionController = {
  getSuggestions: async (req, res) => {
    try {
      const { topicId, status, search } = req.query;
      const data = await suggestionService.getSuggestions(req.user._id, {
        topicId,
        status,
        search,
      });
      return ApiResponse.success(res, data, "Lấy gợi ý thành công");
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  // Gợi ý theo tag cho user
  async getTagSuggestions(req, res) {
    try {
      const userId = req.user._id;
      console.log("Getting tag suggestions for user:", userId);

      // Lấy thống kê tag của user
      const stats = await UserTagStats.find({
        user: userId,
        totalAnswered: { $gte: 0 }, // Lấy cả tag đã gặp nhưng chưa đúng
      })
        .populate("tag", "name")
        .populate("topic", "name");

      console.log("Found stats:", stats.length);

      // Lấy tổng số câu hỏi thuộc từng tag
      const tagIds = stats.map((stat) => stat.tag?._id).filter(Boolean);
      const Question = require("../models/Question");
      const tagQuestionCounts = {};
      if (tagIds.length > 0) {
        const counts = await Question.aggregate([
          { $match: { tags: { $in: tagIds } } },
          { $unwind: "$tags" },
          { $match: { tags: { $in: tagIds } } },
          { $group: { _id: "$tags", count: { $sum: 1 } } },
        ]);
        counts.forEach((c) => {
          tagQuestionCounts[c._id.toString()] = c.count;
        });
      }

      // Map dữ liệu trả về
      const suggestions = stats.map((stat) => {
        const percent =
          stat.totalAnswered > 0
            ? Math.round((stat.correctAnswered / stat.totalAnswered) * 100)
            : 0;
        let status = "Bình thường";
        if (percent < 50) status = "Cần cải thiện";
        else if (percent >= 80) status = "Thành thạo";
        return {
          tagId: stat.tag?._id,
          tagName: stat.tag?.name || "",
          topicName: stat.topic?.name || "",
          correct: stat.correctAnswered,
          total: stat.totalAnswered,
          percent,
          status,
          totalQuestionsInTag:
            tagQuestionCounts[stat.tag?._id?.toString()] || 0,
        };
      });

      console.log("Returning suggestions:", suggestions.length);
      return res.json({ success: true, suggestions });
    } catch (error) {
      console.error("Error in getTagSuggestions:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async getTagSuggestionsController(req, res) {
    try {
      const userId = req.user._id;
      const suggestions = await suggestionService.getTagSuggestions(userId);
      return res.json({ success: true, suggestions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async suggestExamsByWeakTopics(req, res) {
    try {
      const userId = req.user._id;
      // Có thể nhận minScore từ query nếu muốn tùy chỉnh
      const minScore = Number(req.query.minScore) || 60;
      const suggestions = await suggestionService.suggestExamsByWeakTopics(userId, minScore);
      return res.json({ success: true, suggestions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = {
  suggestionController,
};
