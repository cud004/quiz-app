const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
async function generateExplanation(question, options, correctAnswer) {
  const prompt = `
  Giải thích trong 1-2 câu tại sao đáp án đúng là "${correctAnswer}" cho câu hỏi sau:
  ${question}
  Chỉ trả lời ngắn gọn, đúng trọng tâm, bằng tiếng Việt và dễ hiểu cho sinh viên CNTT.
`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      body
    );
    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có giải thích.';
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    return 'Không thể sinh giải thích tự động.';
  }
}

module.exports = { generateExplanation }; 