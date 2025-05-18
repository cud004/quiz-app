const mongoose = require('mongoose');
const Question = require('./src/models/Question');
const Tag = require('./src/models/Tag');
const Topic = require('./src/models/Topic');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const adminId = new mongoose.Types.ObjectId('662382a65a3a53a8776ae905');

// Mẫu câu hỏi cho từng topic, mỗi câu hỏi chỉ gán tag thuộc topic đó
const questionsData = [
  // Lập trình Web
  {
    content: "React là gì?",
    options: [
      { label: "A", text: "Thư viện JavaScript cho UI" },
      { label: "B", text: "Ngôn ngữ lập trình" },
      { label: "C", text: "Cơ sở dữ liệu" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "React là thư viện JavaScript phổ biến để xây dựng giao diện người dùng.",
    difficulty: "easy",
    points: 1,
    tags: ["React", "Frontend"],
    topic: "Lập trình Web",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Node.js là gì?",
    options: [
      { label: "A", text: "Runtime JavaScript phía server" },
      { label: "B", text: "Thư viện CSS" },
      { label: "C", text: "Cơ sở dữ liệu" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "Node.js là môi trường chạy JavaScript phía server.",
    difficulty: "easy",
    points: 1,
    tags: ["Node.js", "Backend"],
    topic: "Lập trình Web",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "RESTful API là gì và các nguyên tắc cơ bản của nó?",
    options: [
      {
        label: "A",
        text: "Là một kiến trúc API tuân theo các nguyên tắc REST, sử dụng HTTP methods và stateless"
      },
      {
        label: "B",
        text: "Là một giao thức truyền dữ liệu chỉ dùng cho web"
      },
      {
        label: "C",
        text: "Là một framework để xây dựng web applications"
      },
      {
        label: "D",
        text: "Là một ngôn ngữ lập trình mới"
      }
    ],
    correctAnswer: "A",
    explanation: "RESTful API là một kiến trúc API tuân theo các nguyên tắc REST, sử dụng HTTP methods (GET, POST, PUT, DELETE) và stateless.",
    difficulty: "medium",
    points: 1,
    tags: ["API", "Backend", "Web Development"],
    topic: "Lập trình Web",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "SPA (Single Page Application) là gì?",
    options: [
      { label: "A", text: "Ứng dụng web chỉ có một trang HTML, tải động nội dung" },
      { label: "B", text: "Ứng dụng web nhiều trang HTML" },
      { label: "C", text: "Ứng dụng desktop" },
      { label: "D", text: "Ứng dụng di động" }
    ],
    correctAnswer: "A",
    explanation: "SPA là ứng dụng web chỉ có một trang HTML, tải động nội dung qua JavaScript.",
    difficulty: "medium",
    points: 1,
    tags: ["React", "Web Development", "Frontend"],
    topic: "Lập trình Web",
    createdBy: adminId,
    isActive: true
  },

  // Cơ sở dữ liệu
  {
    content: "SQL là gì?",
    options: [
      { label: "A", text: "Ngôn ngữ truy vấn cơ sở dữ liệu" },
      { label: "B", text: "Ngôn ngữ lập trình" },
      { label: "C", text: "Hệ quản trị cơ sở dữ liệu" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "SQL là ngôn ngữ truy vấn cơ sở dữ liệu.",
    difficulty: "easy",
    points: 1,
    tags: ["SQL", "NoSQL"],
    topic: "Cơ sở dữ liệu",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "MongoDB là gì?",
    options: [
      { label: "A", text: "Cơ sở dữ liệu NoSQL" },
      { label: "B", text: "Ngôn ngữ lập trình" },
      { label: "C", text: "Trình duyệt web" },
      { label: "D", text: "Hệ điều hành" }
    ],
    correctAnswer: "A",
    explanation: "MongoDB là cơ sở dữ liệu NoSQL.",
    difficulty: "easy",
    points: 1,
    tags: ["MongoDB", "NoSQL"],
    topic: "Cơ sở dữ liệu",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Index trong database là gì và khi nào nên sử dụng?",
    options: [
      {
        label: "A",
        text: "Là cấu trúc dữ liệu giúp tăng tốc độ truy vấn, nên dùng cho các cột thường xuyên tìm kiếm"
      },
      {
        label: "B",
        text: "Là cách để lưu trữ dữ liệu trong database"
      },
      {
        label: "C",
        text: "Là phương pháp backup dữ liệu"
      },
      {
        label: "D",
        text: "Là công cụ để phân tích hiệu suất database"
      }
    ],
    correctAnswer: "A",
    explanation: "Index là cấu trúc dữ liệu giúp tăng tốc độ truy vấn, nên được sử dụng cho các cột thường xuyên được tìm kiếm hoặc join.",
    difficulty: "medium",
    points: 1,
    tags: ["Database", "SQL", "Performance"],
    topic: "Cơ sở dữ liệu",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "ACID trong database là gì?",
    options: [
      {
        label: "A",
        text: "Atomicity, Consistency, Isolation, Durability - các tính chất đảm bảo tính toàn vẹn của transaction"
      },
      {
        label: "B",
        text: "Một loại database mới"
      },
      {
        label: "C",
        text: "Công cụ để tối ưu database"
      },
      {
        label: "D",
        text: "Phương pháp backup dữ liệu"
      }
    ],
    correctAnswer: "A",
    explanation: "ACID là tập hợp các tính chất đảm bảo tính toàn vẹn của transaction trong database.",
    difficulty: "hard",
    points: 1,
    tags: ["Database", "Transaction", "ACID"],
    topic: "Cơ sở dữ liệu",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "NoSQL là gì?",
    options: [
      { label: "A", text: "Cơ sở dữ liệu phi quan hệ" },
      { label: "B", text: "Ngôn ngữ lập trình" },
      { label: "C", text: "Trình duyệt web" },
      { label: "D", text: "Hệ điều hành" }
    ],
    correctAnswer: "A",
    explanation: "NoSQL là loại cơ sở dữ liệu phi quan hệ.",
    difficulty: "easy",
    points: 1,
    tags: ["MongoDB", "Database", "NoSQL"],
    topic: "Cơ sở dữ liệu",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Primary Key trong database là gì?",
    options: [
      { label: "A", text: "Khóa chính, định danh duy nhất cho mỗi bản ghi" },
      { label: "B", text: "Khóa phụ" },
      { label: "C", text: "Cột dữ liệu" },
      { label: "D", text: "Bảng dữ liệu" }
    ],
    correctAnswer: "A",
    explanation: "Primary Key là khóa chính, định danh duy nhất cho mỗi bản ghi trong bảng.",
    difficulty: "easy",
    points: 1,
    tags: ["SQL", "Database", "Primary Key"],
    topic: "Cơ sở dữ liệu",
    createdBy: adminId,
    isActive: true
  },

  // Lập trình Mobile
  {
    content: "React Native là gì?",
    options: [
      { label: "A", text: "Framework phát triển ứng dụng di động" },
      { label: "B", text: "Ngôn ngữ lập trình" },
      { label: "C", text: "Cơ sở dữ liệu" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "React Native là framework phát triển ứng dụng di động.",
    difficulty: "easy",
    points: 1,
    tags: ["React Native", "Expo"],
    topic: "Lập trình Mobile",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Flutter là gì?",
    options: [
      { label: "A", text: "Framework phát triển ứng dụng di động" },
      { label: "B", text: "Ngôn ngữ lập trình" },
      { label: "C", text: "Cơ sở dữ liệu" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "Flutter là framework phát triển ứng dụng di động.",
    difficulty: "easy",
    points: 1,
    tags: ["Flutter", "Android"],
    topic: "Lập trình Mobile",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Native app và Hybrid app khác nhau như thế nào?",
    options: [
      {
        label: "A",
        text: "Native app được viết bằng ngôn ngữ riêng của platform, Hybrid app sử dụng web technologies"
      },
      {
        label: "B",
        text: "Native app chỉ chạy trên iOS, Hybrid app chỉ chạy trên Android"
      },
      {
        label: "C",
        text: "Native app là ứng dụng game, Hybrid app là ứng dụng thông thường"
      },
      {
        label: "D",
        text: "Không có sự khác biệt giữa hai loại"
      }
    ],
    correctAnswer: "A",
    explanation: "Native app được viết bằng ngôn ngữ riêng của platform (Swift/Objective-C cho iOS, Java/Kotlin cho Android), trong khi Hybrid app sử dụng web technologies (HTML, CSS, JavaScript).",
    difficulty: "easy",
    points: 1,
    tags: ["Mobile", "Native", "Hybrid"],
    topic: "Lập trình Mobile",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Expo trong React Native là gì?",
    options: [
      { label: "A", text: "Bộ công cụ phát triển ứng dụng di động với React Native" },
      { label: "B", text: "Ngôn ngữ lập trình mới" },
      { label: "C", text: "Cơ sở dữ liệu" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "Expo là bộ công cụ phát triển ứng dụng di động với React Native.",
    difficulty: "medium",
    points: 1,
    tags: ["React Native", "Mobile Development", "Expo"],
    topic: "Lập trình Mobile",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "APK là gì trong phát triển Android?",
    options: [
      { label: "A", text: "Android Package, file cài đặt ứng dụng Android" },
      { label: "B", text: "Một loại cơ sở dữ liệu" },
      { label: "C", text: "Thư viện JavaScript" },
      { label: "D", text: "Trình duyệt web" }
    ],
    correctAnswer: "A",
    explanation: "APK là file cài đặt ứng dụng Android (Android Package).",
    difficulty: "easy",
    points: 1,
    tags: ["Android", "Mobile Development", "APK"],
    topic: "Lập trình Mobile",
    createdBy: adminId,
    isActive: true
  },

  // Trí tuệ nhân tạo & Machine Learning
  {
    content: "Supervised Learning là gì?",
    options: [
      {
        label: "A",
        text: "Là phương pháp học máy sử dụng dữ liệu đã được gán nhãn để huấn luyện model"
      },
      {
        label: "B",
        text: "Là phương pháp học máy không cần dữ liệu"
      },
      {
        label: "C",
        text: "Là phương pháp học máy chỉ dùng cho computer vision"
      },
      {
        label: "D",
        text: "Là phương pháp học máy chỉ dùng cho NLP"
      }
    ],
    correctAnswer: "A",
    explanation: "Supervised Learning là phương pháp học máy sử dụng dữ liệu đã được gán nhãn để huấn luyện model.",
    difficulty: "medium",
    points: 1,
    tags: ["AI", "Machine Learning", "Supervised Learning"],
    topic: "Trí tuệ nhân tạo & Machine Learning",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Neural Network là gì?",
    options: [
      {
        label: "A",
        text: "Là mô hình học máy mô phỏng cấu trúc của não người, gồm nhiều neuron kết nối với nhau"
      },
      {
        label: "B",
        text: "Là mạng máy tính thông thường"
      },
      {
        label: "C",
        text: "Là công cụ để phân tích dữ liệu"
      },
      {
        label: "D",
        text: "Là phương pháp lập trình mới"
      }
    ],
    correctAnswer: "A",
    explanation: "Neural Network là mô hình học máy mô phỏng cấu trúc của não người, gồm nhiều neuron kết nối với nhau.",
    difficulty: "hard",
    points: 1,
    tags: ["AI", "Neural Network", "Deep Learning"],
    topic: "Trí tuệ nhân tạo & Machine Learning",
    createdBy: adminId,
    isActive: true
  },

  // Bảo mật thông tin
  {
    content: "XSS (Cross-Site Scripting) là gì?",
    options: [
      {
        label: "A",
        text: "Là lỗ hổng bảo mật cho phép kẻ tấn công chèn mã độc vào website"
      },
      {
        label: "B",
        text: "Là phương pháp bảo mật website"
      },
      {
        label: "C",
        text: "Là công cụ để test bảo mật"
      },
      {
        label: "D",
        text: "Là giao thức bảo mật mới"
      }
    ],
    correctAnswer: "A",
    explanation: "XSS là lỗ hổng bảo mật cho phép kẻ tấn công chèn mã độc vào website, thực thi trên trình duyệt của người dùng.",
    difficulty: "medium",
    points: 1,
    tags: ["Security", "Web Security", "XSS"],
    topic: "Bảo mật thông tin",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "SSL/TLS là gì?",
    options: [
      {
        label: "A",
        text: "Là giao thức bảo mật để mã hóa dữ liệu truyền tải trên mạng"
      },
      {
        label: "B",
        text: "Là phương pháp backup dữ liệu"
      },
      {
        label: "C",
        text: "Là công cụ để quản lý mật khẩu"
      },
      {
        label: "D",
        text: "Là giao thức để tăng tốc độ mạng"
      }
    ],
    correctAnswer: "A",
    explanation: "SSL/TLS là giao thức bảo mật để mã hóa dữ liệu truyền tải trên mạng, đảm bảo tính bảo mật và toàn vẹn của dữ liệu.",
    difficulty: "medium",
    points: 1,
    tags: ["Security", "SSL", "TLS"],
    topic: "Bảo mật thông tin",
    createdBy: adminId,
    isActive: true
  },

  // DevOps & Cloud Computing
  {
    content: "Docker là gì?",
    options: [
      {
        label: "A",
        text: "Là công cụ để đóng gói ứng dụng và dependencies vào container"
      },
      {
        label: "B",
        text: "Là hệ điều hành mới"
      },
      {
        label: "C",
        text: "Là công cụ để quản lý database"
      },
      {
        label: "D",
        text: "Là phương pháp backup dữ liệu"
      }
    ],
    correctAnswer: "A",
    explanation: "Docker là công cụ để đóng gói ứng dụng và dependencies vào container, giúp dễ dàng triển khai và chạy ứng dụng trên nhiều môi trường khác nhau.",
    difficulty: "medium",
    points: 1,
    tags: ["DevOps", "Docker", "Container"],
    topic: "DevOps & Cloud Computing",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "CI/CD là gì?",
    options: [
      {
        label: "A",
        text: "Là quy trình tự động hóa việc build, test và deploy ứng dụng"
      },
      {
        label: "B",
        text: "Là công cụ để quản lý code"
      },
      {
        label: "C",
        text: "Là phương pháp backup dữ liệu"
      },
      {
        label: "D",
        text: "Là giao thức bảo mật mới"
      }
    ],
    correctAnswer: "A",
    explanation: "CI/CD là quy trình tự động hóa việc build, test và deploy ứng dụng, giúp tăng tốc độ phát triển và giảm thiểu lỗi.",
    difficulty: "medium",
    points: 1,
    tags: ["DevOps", "CI/CD", "Automation"],
    topic: "DevOps & Cloud Computing",
    createdBy: adminId,
    isActive: true
  },

  // Lập trình Game
  {
    content: "Unity là gì?",
    options: [
      {
        label: "A",
        text: "Là game engine phổ biến để phát triển game 2D và 3D"
      },
      {
        label: "B",
        text: "Là ngôn ngữ lập trình game"
      },
      {
        label: "C",
        text: "Là công cụ để test game"
      },
      {
        label: "D",
        text: "Là platform chỉ dành cho mobile game"
      }
    ],
    correctAnswer: "A",
    explanation: "Unity là game engine phổ biến để phát triển game 2D và 3D, hỗ trợ nhiều platform khác nhau.",
    difficulty: "easy",
    points: 1,
    tags: ["Game Development", "Unity", "3D"],
    topic: "Lập trình Game",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Game Loop là gì?",
    options: [
      {
        label: "A",
        text: "Là vòng lặp chính của game, xử lý input, update và render"
      },
      {
        label: "B",
        text: "Là vòng lặp để tạo animation"
      },
      {
        label: "C",
        text: "Là vòng lặp để load game"
      },
      {
        label: "D",
        text: "Là vòng lặp để save game"
      }
    ],
    correctAnswer: "A",
    explanation: "Game Loop là vòng lặp chính của game, xử lý input từ người chơi, update trạng thái game và render hình ảnh.",
    difficulty: "medium",
    points: 1,
    tags: ["Game Development", "Game Loop", "Game Engine"],
    topic: "Lập trình Game",
    createdBy: adminId,
    isActive: true
  },

  // Blockchain & Cryptocurrency
  {
    content: "Blockchain là gì?",
    options: [
      {
        label: "A",
        text: "Là công nghệ sổ cái phân tán, lưu trữ dữ liệu trong các khối liên kết với nhau"
      },
      {
        label: "B",
        text: "Là công cụ để quản lý tiền điện tử"
      },
      {
        label: "C",
        text: "Là phương pháp mã hóa dữ liệu"
      },
      {
        label: "D",
        text: "Là giao thức bảo mật mới"
      }
    ],
    correctAnswer: "A",
    explanation: "Blockchain là công nghệ sổ cái phân tán, lưu trữ dữ liệu trong các khối liên kết với nhau, đảm bảo tính minh bạch và bất biến.",
    difficulty: "medium",
    points: 1,
    tags: ["Blockchain", "Cryptocurrency", "Distributed Ledger"],
    topic: "Blockchain & Cryptocurrency",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Smart Contract là gì?",
    options: [
      {
        label: "A",
        text: "Là hợp đồng tự động thực thi trên blockchain khi đáp ứng điều kiện"
      },
      {
        label: "B",
        text: "Là hợp đồng thông minh thông thường"
      },
      {
        label: "C",
        text: "Là công cụ để quản lý tiền điện tử"
      },
      {
        label: "D",
        text: "Là phương pháp bảo mật mới"
      }
    ],
    correctAnswer: "A",
    explanation: "Smart Contract là hợp đồng tự động thực thi trên blockchain khi đáp ứng điều kiện, không cần bên thứ ba.",
    difficulty: "hard",
    points: 1,
    tags: ["Blockchain", "Smart Contract", "Ethereum"],
    topic: "Blockchain & Cryptocurrency",
    createdBy: adminId,
    isActive: true
  },

  // Internet of Things (IoT)
  {
    content: "IoT là gì?",
    options: [
      {
        label: "A",
        text: "Là mạng lưới các thiết bị vật lý được kết nối internet, có thể thu thập và chia sẻ dữ liệu"
      },
      {
        label: "B",
        text: "Là công nghệ chỉ dành cho smartphone"
      },
      {
        label: "C",
        text: "Là phương pháp bảo mật mới"
      },
      {
        label: "D",
        text: "Là giao thức truyền dữ liệu mới"
      }
    ],
    correctAnswer: "A",
    explanation: "IoT là mạng lưới các thiết bị vật lý được kết nối internet, có thể thu thập và chia sẻ dữ liệu.",
    difficulty: "easy",
    points: 1,
    tags: ["IoT", "Embedded Systems", "Sensors"],
    topic: "Internet of Things (IoT)",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "MQTT là gì?",
    options: [
      {
        label: "A",
        text: "Là giao thức truyền tin nhắn nhẹ, phổ biến trong IoT"
      },
      {
        label: "B",
        text: "Là công nghệ chỉ dành cho smartphone"
      },
      {
        label: "C",
        text: "Là phương pháp bảo mật mới"
      },
      {
        label: "D",
        text: "Là giao thức truyền dữ liệu mới"
      }
    ],
    correctAnswer: "A",
    explanation: "MQTT là giao thức truyền tin nhắn nhẹ, phổ biến trong IoT, cho phép các thiết bị giao tiếp hiệu quả với nhau.",
    difficulty: "medium",
    points: 1,
    tags: ["IoT", "MQTT", "Protocol"],
    topic: "Internet of Things (IoT)",
    createdBy: adminId,
    isActive: true
  },

  // Big Data & Data Science
  {
    content: "Big Data là gì?",
    options: [
      {
        label: "A",
        text: "Là tập hợp dữ liệu lớn, phức tạp, đa dạng, cần công cụ đặc biệt để xử lý"
      },
      {
        label: "B",
        text: "Là công cụ để quản lý dữ liệu"
      },
      {
        label: "C",
        text: "Là phương pháp backup dữ liệu"
      },
      {
        label: "D",
        text: "Là giao thức truyền dữ liệu mới"
      }
    ],
    correctAnswer: "A",
    explanation: "Big Data là tập hợp dữ liệu lớn, phức tạp, đa dạng, cần công cụ đặc biệt để xử lý và phân tích.",
    difficulty: "medium",
    points: 1,
    tags: ["Big Data", "Data Science", "Analytics"],
    topic: "Big Data & Data Science",
    createdBy: adminId,
    isActive: true
  },
  {
    content: "Data Mining là gì?",
    options: [
      {
        label: "A",
        text: "Là quá trình khám phá các mẫu và thông tin có giá trị từ dữ liệu lớn"
      },
      {
        label: "B",
        text: "Là công cụ để quản lý dữ liệu"
      },
      {
        label: "C",
        text: "Là phương pháp backup dữ liệu"
      },
      {
        label: "D",
        text: "Là giao thức truyền dữ liệu mới"
      }
    ],
    correctAnswer: "A",
    explanation: "Data Mining là quá trình khám phá các mẫu và thông tin có giá trị từ dữ liệu lớn, giúp đưa ra quyết định dựa trên dữ liệu.",
    difficulty: "hard",
    points: 1,
    tags: ["Big Data", "Data Mining", "Analytics"],
    topic: "Big Data & Data Science",
    createdBy: adminId,
    isActive: true
  }
];

// Hàm seed dữ liệu
async function seedQuestions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Lấy tất cả tags từ database
    const tags = await Tag.find({});
    const tagMap = {};
    tags.forEach(tag => {
      tagMap[tag.name] = tag._id;
    });

    // Lấy tất cả topics từ database
    const topics = await Topic.find({});
    const topicMap = {};
    topics.forEach(topic => {
      topicMap[topic.name] = topic._id;
    });

    // Cập nhật tags và topic trong questionsData thành ObjectId
    questionsData.forEach(question => {
      question.tags = question.tags.map(tagName => tagMap[tagName]).filter(Boolean);
      question.topic = topicMap[question.topic];
    });

    // Xóa dữ liệu cũ
    await Question.deleteMany({});
    console.log('Deleted old questions');

    // Thêm dữ liệu mới
    const questions = await Question.insertMany(questionsData);
    console.log(`Added ${questions.length} questions`);

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Chạy seed
seedQuestions(); 