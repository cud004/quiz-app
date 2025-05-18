// ... existing code ...
// Thêm câu hỏi cho Cấu trúc dữ liệu
const dataStructureQuestions = [
  {
    content: 'Cấu trúc dữ liệu nào sau đây là LIFO?',
    options: [
      { label: 'A', text: 'Queue' },
      { label: 'B', text: 'Stack' },
      { label: 'C', text: 'Tree' },
      { label: 'D', text: 'Graph' }
    ],
    correctAnswer: 'B',
    explanation: 'Stack là cấu trúc LIFO (Last In First Out).',
    difficulty: 'easy',
    points: 1,
    topic: topics[0]._id, // Cấu trúc dữ liệu
    tags: [tags[0]._id, tags[1]._id], // Data Structures, Algorithms
    isActive: true
  },
  {
    content: 'Cấu trúc dữ liệu nào sau đây là FIFO?',
    options: [
      { label: 'A', text: 'Stack' },
      { label: 'B', text: 'Queue' },
      { label: 'C', text: 'Tree' },
      { label: 'D', text: 'Graph' }
    ],
    correctAnswer: 'B',
    explanation: 'Queue là cấu trúc FIFO (First In First Out).',
    difficulty: 'easy',
    points: 1,
    topic: topics[0]._id, // Cấu trúc dữ liệu
    tags: [tags[0]._id, tags[1]._id], // Data Structures, Algorithms
    isActive: true
  },
  {
    content: 'Cấu trúc dữ liệu nào sau đây là cây nhị phân?',
    options: [
      { label: 'A', text: 'Stack' },
      { label: 'B', text: 'Queue' },
      { label: 'C', text: 'Binary Tree' },
      { label: 'D', text: 'Graph' }
    ],
    correctAnswer: 'C',
    explanation: 'Binary Tree là cấu trúc cây nhị phân.',
    difficulty: 'medium',
    points: 1,
    topic: topics[0]._id, // Cấu trúc dữ liệu
    tags: [tags[0]._id, tags[1]._id], // Data Structures, Algorithms
    isActive: true
  }
];

// Thêm câu hỏi cho Lập trình Web
const webDevQuestions = [
  {
    content: 'HTML là viết tắt của gì?',
    options: [
      { label: 'A', text: 'Hyper Text Markup Language' },
      { label: 'B', text: 'High Tech Modern Language' },
      { label: 'C', text: 'Hyper Transfer Markup Language' },
      { label: 'D', text: 'Hyper Text Modern Language' }
    ],
    correctAnswer: 'A',
    explanation: 'HTML là Hyper Text Markup Language.',
    difficulty: 'easy',
    points: 1,
    topic: topics[1]._id, // Lập trình Web
    tags: [tags[2]._id, tags[3]._id], // Frontend, Backend
    isActive: true
  },
  {
    content: 'CSS là viết tắt của gì?',
    options: [
      { label: 'A', text: 'Computer Style Sheets' },
      { label: 'B', text: 'Cascading Style Sheets' },
      { label: 'C', text: 'Creative Style Sheets' },
      { label: 'D', text: 'Colorful Style Sheets' }
    ],
    correctAnswer: 'B',
    explanation: 'CSS là Cascading Style Sheets.',
    difficulty: 'easy',
    points: 1,
    topic: topics[1]._id, // Lập trình Web
    tags: [tags[2]._id, tags[3]._id], // Frontend, Backend
    isActive: true
  },
  {
    content: 'JavaScript là ngôn ngữ gì?',
    options: [
      { label: 'A', text: 'Ngôn ngữ lập trình phía máy chủ' },
      { label: 'B', text: 'Ngôn ngữ lập trình phía máy khách' },
      { label: 'C', text: 'Ngôn ngữ lập trình phía máy chủ và máy khách' },
      { label: 'D', text: 'Ngôn ngữ lập trình phía máy chủ và máy khách và di động' }
    ],
    correctAnswer: 'C',
    explanation: 'JavaScript là ngôn ngữ lập trình phía máy chủ và máy khách.',
    difficulty: 'medium',
    points: 1,
    topic: topics[1]._id, // Lập trình Web
    tags: [tags[2]._id, tags[3]._id], // Frontend, Backend
    isActive: true
  }
];

// Thêm câu hỏi cho Lập trình Mobile
const mobileDevQuestions = [
  {
    content: 'React Native là gì?',
    options: [
      { label: 'A', text: 'Framework lập trình web' },
      { label: 'B', text: 'Framework lập trình di động' },
      { label: 'C', text: 'Framework lập trình máy chủ' },
      { label: 'D', text: 'Framework lập trình desktop' }
    ],
    correctAnswer: 'B',
    explanation: 'React Native là framework lập trình di động.',
    difficulty: 'easy',
    points: 1,
    topic: topics[2]._id, // Lập trình Mobile
    tags: [tags[4]._id, tags[5]._id], // Mobile, React
    isActive: true
  },
  {
    content: 'Flutter là gì?',
    options: [
      { label: 'A', text: 'Framework lập trình web' },
      { label: 'B', text: 'Framework lập trình di động' },
      { label: 'C', text: 'Framework lập trình máy chủ' },
      { label: 'D', text: 'Framework lập trình desktop' }
    ],
    correctAnswer: 'B',
    explanation: 'Flutter là framework lập trình di động.',
    difficulty: 'easy',
    points: 1,
    topic: topics[2]._id, // Lập trình Mobile
    tags: [tags[4]._id, tags[5]._id], // Mobile, React
    isActive: true
  },
  {
    content: 'Swift là ngôn ngữ lập trình cho nền tảng nào?',
    options: [
      { label: 'A', text: 'Android' },
      { label: 'B', text: 'iOS' },
      { label: 'C', text: 'Windows' },
      { label: 'D', text: 'Linux' }
    ],
    correctAnswer: 'B',
    explanation: 'Swift là ngôn ngữ lập trình cho iOS.',
    difficulty: 'medium',
    points: 1,
    topic: topics[2]._id, // Lập trình Mobile
    tags: [tags[4]._id, tags[5]._id], // Mobile, React
    isActive: true
  }
];

// Thêm câu hỏi vào mảng questions
questions.push(...dataStructureQuestions, ...webDevQuestions, ...mobileDevQuestions);
// ... existing code ... 