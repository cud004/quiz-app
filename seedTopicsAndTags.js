const mongoose = require('mongoose');
const Topic = require('./src/models/Topic');
const Tag = require('./src/models/Tag');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const adminId = new mongoose.Types.ObjectId('662382a65a3a53a8776ae905');

// Topics data
const topicsData = [
  {
    name: "Lập trình Web",
    description: "Các công nghệ phát triển web hiện đại",
    category: "Web Development",
    difficulty: "beginner",
    order: 1,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Cơ sở dữ liệu",
    description: "Kiến thức về các hệ quản trị cơ sở dữ liệu",
    category: "Database",
    difficulty: "beginner",
    order: 2,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Lập trình Mobile",
    description: "Phát triển ứng dụng di động",
    category: "Mobile Development",
    difficulty: "intermediate",
    order: 3,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Trí tuệ nhân tạo & Machine Learning",
    description: "Các khái niệm và ứng dụng của AI/ML",
    category: "AI/ML",
    difficulty: "advanced",
    order: 4,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Bảo mật thông tin",
    description: "Kiến thức về bảo mật và bảo vệ dữ liệu",
    category: "Security",
    difficulty: "intermediate",
    order: 5,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "DevOps & Cloud Computing",
    description: "Quản lý và triển khai ứng dụng trên nền tảng đám mây",
    category: "DevOps",
    difficulty: "intermediate",
    order: 6,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Lập trình Game",
    description: "Phát triển game và đồ họa máy tính",
    category: "Game Development",
    difficulty: "intermediate",
    order: 7,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Blockchain & Cryptocurrency",
    description: "Công nghệ blockchain và tiền điện tử",
    category: "Blockchain",
    difficulty: "advanced",
    order: 8,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Internet of Things (IoT)",
    description: "Kết nối và điều khiển thiết bị thông minh",
    category: "IoT",
    difficulty: "intermediate",
    order: 9,
    isActive: true,
    createdBy: adminId
  },
  {
    name: "Big Data & Data Science",
    description: "Phân tích và xử lý dữ liệu lớn",
    category: "Data Science",
    difficulty: "advanced",
    order: 10,
    isActive: true,
    createdBy: adminId
  }
];

// Tags data
const tagsData = [
  // Web Development Tags
  {
    name: "React",
    description: "Thư viện JavaScript cho UI",
    topicName: "Lập trình Web",
    isActive: true
  },
  {
    name: "Node.js",
    description: "Runtime JavaScript phía server",
    topicName: "Lập trình Web",
    isActive: true
  },
  {
    name: "HTML",
    description: "Ngôn ngữ đánh dấu siêu văn bản",
    topicName: "Lập trình Web",
    isActive: true
  },
  {
    name: "CSS",
    description: "Ngôn ngữ định kiểu cho web",
    topicName: "Lập trình Web",
    isActive: true
  },
  {
    name: "Frontend",
    description: "Phát triển giao diện người dùng",
    topicName: "Lập trình Web",
    isActive: true
  },
  {
    name: "Backend",
    description: "Phát triển phía máy chủ",
    topicName: "Lập trình Web",
    isActive: true
  },

  // Database Tags
  {
    name: "SQL",
    description: "Ngôn ngữ truy vấn cơ sở dữ liệu",
    topicName: "Cơ sở dữ liệu",
    isActive: true
  },
  {
    name: "MongoDB",
    description: "Cơ sở dữ liệu NoSQL",
    topicName: "Cơ sở dữ liệu",
    isActive: true
  },
  {
    name: "NoSQL",
    description: "Cơ sở dữ liệu phi quan hệ",
    topicName: "Cơ sở dữ liệu",
    isActive: true
  },
  {
    name: "Primary Key",
    description: "Khóa chính trong database",
    topicName: "Cơ sở dữ liệu",
    isActive: true
  },

  // Mobile Development Tags
  {
    name: "React Native",
    description: "Framework phát triển ứng dụng di động",
    topicName: "Lập trình Mobile",
    isActive: true
  },
  {
    name: "Flutter",
    description: "Framework phát triển ứng dụng di động",
    topicName: "Lập trình Mobile",
    isActive: true
  },
  {
    name: "Android",
    description: "Nền tảng phát triển ứng dụng Android",
    topicName: "Lập trình Mobile",
    isActive: true
  },
  {
    name: "APK",
    description: "Android Package, file cài đặt ứng dụng Android",
    topicName: "Lập trình Mobile",
    isActive: true
  },
  {
    name: "Expo",
    description: "Bộ công cụ phát triển React Native",
    topicName: "Lập trình Mobile",
    isActive: true
  },

  // AI/ML Tags
  {
    name: "Machine Learning",
    description: "Học máy và các thuật toán",
    topicName: "Trí tuệ nhân tạo & Machine Learning",
    isActive: true
  },
  {
    name: "Deep Learning",
    description: "Học sâu và mạng neural",
    topicName: "Trí tuệ nhân tạo & Machine Learning",
    isActive: true
  },
  {
    name: "TensorFlow",
    description: "Framework machine learning",
    topicName: "Trí tuệ nhân tạo & Machine Learning",
    isActive: true
  },
  {
    name: "PyTorch",
    description: "Framework deep learning",
    topicName: "Trí tuệ nhân tạo & Machine Learning",
    isActive: true
  },

  // Security Tags
  {
    name: "Network Security",
    description: "Bảo mật mạng và hệ thống",
    topicName: "Bảo mật thông tin",
    isActive: true
  },
  {
    name: "Web Security",
    description: "Bảo mật ứng dụng web",
    topicName: "Bảo mật thông tin",
    isActive: true
  },
  {
    name: "Cryptography",
    description: "Mã hóa và bảo mật dữ liệu",
    topicName: "Bảo mật thông tin",
    isActive: true
  },
  {
    name: "Penetration Testing",
    description: "Kiểm thử xâm nhập",
    topicName: "Bảo mật thông tin",
    isActive: true
  },

  // DevOps Tags
  {
    name: "Docker",
    description: "Container platform",
    topicName: "DevOps & Cloud Computing",
    isActive: true
  },
  {
    name: "Kubernetes",
    description: "Container orchestration",
    topicName: "DevOps & Cloud Computing",
    isActive: true
  },
  {
    name: "AWS",
    description: "Amazon Web Services",
    topicName: "DevOps & Cloud Computing",
    isActive: true
  },
  {
    name: "CI/CD",
    description: "Continuous Integration/Deployment",
    topicName: "DevOps & Cloud Computing",
    isActive: true
  },

  // Game Development Tags
  {
    name: "Unity",
    description: "Game engine phổ biến",
    topicName: "Lập trình Game",
    isActive: true
  },
  {
    name: "Unreal Engine",
    description: "Game engine chuyên nghiệp",
    topicName: "Lập trình Game",
    isActive: true
  },
  {
    name: "Game Design",
    description: "Thiết kế game và gameplay",
    topicName: "Lập trình Game",
    isActive: true
  },
  {
    name: "3D Modeling",
    description: "Tạo mô hình 3D cho game",
    topicName: "Lập trình Game",
    isActive: true
  },

  // Blockchain Tags
  {
    name: "Ethereum",
    description: "Nền tảng blockchain",
    topicName: "Blockchain & Cryptocurrency",
    isActive: true
  },
  {
    name: "Smart Contracts",
    description: "Hợp đồng thông minh",
    topicName: "Blockchain & Cryptocurrency",
    isActive: true
  },
  {
    name: "Web3",
    description: "Web phi tập trung",
    topicName: "Blockchain & Cryptocurrency",
    isActive: true
  },
  {
    name: "Solidity",
    description: "Ngôn ngữ lập trình smart contract",
    topicName: "Blockchain & Cryptocurrency",
    isActive: true
  },

  // IoT Tags
  {
    name: "Arduino",
    description: "Nền tảng phần cứng mở",
    topicName: "Internet of Things (IoT)",
    isActive: true
  },
  {
    name: "Raspberry Pi",
    description: "Máy tính mini cho IoT",
    topicName: "Internet of Things (IoT)",
    isActive: true
  },
  {
    name: "Sensors",
    description: "Cảm biến và thiết bị IoT",
    topicName: "Internet of Things (IoT)",
    isActive: true
  },
  {
    name: "MQTT",
    description: "Giao thức truyền thông IoT",
    topicName: "Internet of Things (IoT)",
    isActive: true
  },

  // Data Science Tags
  {
    name: "Python",
    description: "Ngôn ngữ lập trình cho data science",
    topicName: "Big Data & Data Science",
    isActive: true
  },
  {
    name: "R",
    description: "Ngôn ngữ thống kê",
    topicName: "Big Data & Data Science",
    isActive: true
  },
  {
    name: "Data Analysis",
    description: "Phân tích dữ liệu",
    topicName: "Big Data & Data Science",
    isActive: true
  },
  {
    name: "Data Visualization",
    description: "Trực quan hóa dữ liệu",
    topicName: "Big Data & Data Science",
    isActive: true
  }
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedTopicsAndTags() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Topic.deleteMany({});
    await Tag.deleteMany({});
    console.log('Deleted old topics and tags');

    // Insert topics
    const topics = await Topic.insertMany(topicsData);
    const topicMap = {};
    topics.forEach(topic => {
      topicMap[topic.name] = topic._id;
    });
    console.log('Seeded topics');

    // Insert tags
    const tags = await Tag.insertMany(
      tagsData.map(tag => ({
        name: tag.name,
        description: tag.description,
        topic: topicMap[tag.topicName],
        slug: generateSlug(tag.name),
        isActive: true
      }))
    );
    console.log(`Seeded ${topics.length} topics, ${tags.length} tags`);

    await mongoose.disconnect();
    console.log('Seed completed!');
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedTopicsAndTags(); 