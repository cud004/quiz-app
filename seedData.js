// Seed script for User, Topic, Question, Exam
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Topic = require('./src/models/Topic');
const Question = require('./src/models/Question');
const Exam = require('./src/models/Exam');
const SubscriptionPackage = require('./src/models/SubscriptionPackage');
const bcrypt = require('bcrypt');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const topicNames = [
  'Mạng máy tính',
  'Cơ sở dữ liệu',
  'Lập trình hướng đối tượng',
  'Cấu trúc dữ liệu',
  'Hệ điều hành',
  'An toàn thông tin',
  'Thuật toán',
  'Trí tuệ nhân tạo',
  'Phát triển web',
  'Kiến trúc máy tính'
];

const questionContents = [
  // 10 câu cho mỗi topic, độ khó chia đều
  // Mỗi topic sẽ có 10 câu hỏi mẫu về CNTT
  // ... sẽ sinh tự động bên dưới
];

const difficulties = ['easy', 'medium', 'hard'];
const topicDifficulties = ['beginner', 'intermediate', 'advanced'];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Xóa dữ liệu cũ
  await User.deleteMany({});
  await Topic.deleteMany({});
  await Question.deleteMany({});
  await Exam.deleteMany({});
  await SubscriptionPackage.deleteMany({});

  // 1. Seed user
  const users = [];
  for (let i = 0; i < 10; i++) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    users.push(new User({
      name: i === 0 ? 'Admin' : `User ${i}`,
      email: i === 0 ? 'admin@itquiz.com' : `user${i}@itquiz.com`,
      password: hashedPassword,
      role: i === 0 ? 'admin' : 'user',
      status: 'active',
      isActive: true
    }));
  }
  await User.insertMany(users);
  console.log('Seeded users');

  // 2. Seed topic
  const topics = [];
  for (let i = 0; i < 10; i++) {
    topics.push(new Topic({
      name: topicNames[i],
      description: `Chủ đề về ${topicNames[i]}`,
      createdBy: users[i % users.length]._id,
      difficulty: topicDifficulties[i % 3],
      isActive: true
    }));
  }
  await Topic.insertMany(topics);
  console.log('Seeded topics');

  // 3. Seed question
  const questions = [];
  for (let t = 0; t < 10; t++) {
    for (let q = 0; q < 10; q++) {
      const diff = difficulties[(q + t) % 3];
      const idx = t * 10 + q + 1;
      questions.push(new Question({
        content: `Câu hỏi ${idx} về ${topicNames[t]}: ${generateQuestionContent(topicNames[t], diff, q)}`,
        options: [
          { label: 'A', text: 'Đáp án A' },
          { label: 'B', text: 'Đáp án B' },
          { label: 'C', text: 'Đáp án C' },
          { label: 'D', text: 'Đáp án D' }
        ],
        correctAnswer: ['A', 'B', 'C', 'D'][q % 4],
        explanation: `Giải thích cho câu hỏi ${idx}`,
        difficulty: diff,
        points: 1,
        topics: [topics[t]._id],
        createdBy: users[(t + q) % users.length]._id,
        isActive: true
      }));
    }
  }
  await Question.insertMany(questions);
  console.log('Seeded questions');

  // 4. Seed exam
  const exams = [];
  for (let e = 0; e < 20; e++) {
    const topicIdx = e % 10;
    const examQuestions = questions
      .filter(q => q.topics[0].toString() === topics[topicIdx]._id.toString())
      .slice(0, 5)
      .map((q, i) => ({ question: q._id, points: 1, order: i }));
    exams.push(new Exam({
      title: `Đề thi ${e + 1} - ${topicNames[topicIdx]}`,
      description: `Đề thi về ${topicNames[topicIdx]}`,
      instructions: 'Làm hết sức mình nhé!',
      timeLimit: 30,
      passingScore: 50,
      questions: examQuestions,
      isPublished: true,
      allowReview: true,
      randomizeQuestions: false,
      createdBy: users[e % users.length]._id,
      topics: [topics[topicIdx]._id],
      accessLevel: e % 2 === 0 ? 'free' : 'premium',
      stats: { totalAttempts: 0, completionRate: 0, averageScore: 0, passRate: 0 }
    }));
  }
  await Exam.insertMany(exams);
  console.log('Seeded exams');

  // 5. Seed subscription packages
  const packages = [
    new SubscriptionPackage({
      name: 'free',
      price: 0,
      duration: 1,
      features: [
        'Truy cập giới hạn đề thi',
        'Không có tính năng cao cấp',
        'Không hỗ trợ ưu tiên'
      ],
      examAccess: 'limited',
      maxExamsPerMonth: 5,
      isActive: true
    }),
    new SubscriptionPackage({
      name: 'premium',
      price: 99000,
      duration: 1,
      features: [
        'Truy cập không giới hạn đề thi',
        'Gợi ý thông minh',
        'Hỗ trợ ưu tiên',
        'Không quảng cáo'
      ],
      examAccess: 'unlimited',
      maxExamsPerMonth: 0,
      isActive: true
    }),
    new SubscriptionPackage({
      name: 'pro',
      price: 150000,
      duration: 1,
      features: [
        'Tất cả tính năng của Premium',
        'Báo cáo phân tích nâng cao',
        'Ưu tiên hỗ trợ 24/7',
        'Tham gia sự kiện độc quyền'
      ],
      examAccess: 'unlimited',
      maxExamsPerMonth: 0,
      isActive: true
    })
  ];
  await SubscriptionPackage.insertMany(packages);
  console.log('Seeded subscription packages');

  await mongoose.disconnect();
  console.log('Seed completed!');
}

function generateQuestionContent(topic, diff, idx) {
  // Sinh nội dung câu hỏi mẫu về CNTT
  const base = {
    'Mạng máy tính': [
      'Giao thức TCP/IP là gì?',
      'OSI có bao nhiêu tầng?',
      'Chức năng của router là gì?',
      'Sự khác biệt giữa switch và hub?',
      'Địa chỉ IP lớp C là gì?',
      'DNS dùng để làm gì?',
      'Firewall hoạt động như thế nào?',
      'UDP khác gì TCP?',
      'Mạng LAN là gì?',
      'Wi-Fi hoạt động trên băng tần nào?'
    ],
    'Cơ sở dữ liệu': [
      'SQL là gì?',
      'Khóa chính (Primary Key) là gì?',
      'Lệnh SELECT dùng để làm gì?',
      'Sự khác biệt giữa INNER JOIN và LEFT JOIN?',
      'Chuẩn hóa dữ liệu là gì?',
      'NoSQL khác gì SQL?',
      'Index trong database dùng để làm gì?',
      'ACID là gì?',
      'Stored Procedure là gì?',
      'Trigger hoạt động như thế nào?'
    ],
    'Lập trình hướng đối tượng': [
      'Tính kế thừa là gì?',
      'Đa hình trong OOP là gì?',
      'Constructor dùng để làm gì?',
      'Sự khác biệt giữa class và object?',
      'Tính đóng gói là gì?',
      'Interface là gì?',
      'Abstract class khác gì interface?',
      'Overloading là gì?',
      'Overriding là gì?',
      'Encapsulation là gì?'
    ],
    'Cấu trúc dữ liệu': [
      'Stack là gì?',
      'Queue là gì?',
      'Linked List là gì?',
      'Binary Tree là gì?',
      'Hash Table là gì?',
      'Heap khác gì Stack?',
      'Graph là gì?',
      'DFS và BFS khác nhau thế nào?',
      'Big O notation là gì?',
      'Circular Queue là gì?'
    ],
    'Hệ điều hành': [
      'Process là gì?',
      'Thread khác gì Process?',
      'Deadlock là gì?',
      'Scheduling algorithm là gì?',
      'Semaphore dùng để làm gì?',
      'Paging là gì?',
      'Virtual memory là gì?',
      'File system là gì?',
      'Context switch là gì?',
      'Kernel mode là gì?'
    ],
    'An toàn thông tin': [
      'Mã hóa đối xứng là gì?',
      'RSA là gì?',
      'Hash function dùng để làm gì?',
      'SSL/TLS là gì?',
      'Firewall bảo vệ như thế nào?',
      'Phishing là gì?',
      'Malware là gì?',
      'XSS là gì?',
      'CSRF là gì?',
      'VPN hoạt động như thế nào?'
    ],
    'Thuật toán': [
      'Thuật toán sắp xếp nào nhanh nhất?',
      'Binary search là gì?',
      'Độ phức tạp thuật toán là gì?',
      'Greedy algorithm là gì?',
      'Dynamic programming là gì?',
      'DFS là gì?',
      'BFS là gì?',
      'Backtracking là gì?',
      'Divide and conquer là gì?',
      'Recursion là gì?'
    ],
    'Trí tuệ nhân tạo': [
      'Machine learning là gì?',
      'Deep learning là gì?',
      'Neural network là gì?',
      'Supervised learning là gì?',
      'Unsupervised learning là gì?',
      'Reinforcement learning là gì?',
      'AI khác gì ML?',
      'Natural language processing là gì?',
      'Computer vision là gì?',
      'Expert system là gì?'
    ],
    'Phát triển web': [
      'HTML là gì?',
      'CSS dùng để làm gì?',
      'JavaScript là gì?',
      'HTTP request là gì?',
      'RESTful API là gì?',
      'Frontend và Backend khác nhau thế nào?',
      'SPA là gì?',
      'SSR là gì?',
      'Cookie và Session khác nhau thế nào?',
      'WebSocket là gì?'
    ],
    'Kiến trúc máy tính': [
      'CPU là gì?',
      'RAM dùng để làm gì?',
      'ROM là gì?',
      'Bus trong máy tính là gì?',
      'Cache memory là gì?',
      'ALU là gì?',
      'Register là gì?',
      'Pipeline là gì?',
      'Instruction set là gì?',
      'Motherboard là gì?'
    ]
  };
  return base[topic][idx % 10] + ` (Mức độ: ${diff})`;
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
}); 