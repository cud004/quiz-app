# Quiz App Backend

A comprehensive quiz application backend built with Node.js, Express, and MongoDB. This application provides a complete learning management system with user authentication, quiz management, payment integration, and analytics.

## 🚀 Features

- **User Management**: Registration, authentication, profile management
- **Quiz System**: Create, manage, and take quizzes with various question types
- **Learning Analytics**: Track learning progress and performance
- **Payment Integration**: Support for VNPay and MoMo payment gateways
- **OAuth Integration**: Login with Google and GitHub
- **File Upload**: Image and document upload with ImageKit
- **Admin Dashboard**: System analytics and user management
- **Real-time Features**: Practice sessions and exam attempts
- **RESTful API**: Well-structured API endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, Passport.js (Google, GitHub OAuth)
- **File Upload**: ImageKit, Multer
- **Payment**: VNPay, MoMo
- **Security**: Helmet, CORS, Rate Limiting, XSS Protection
- **Validation**: Joi, Express Validator

## 📁 Project Structure

```
quiz-app/
├── src/
│   ├── config/           # Configuration files
│   ├── constants/        # Application constants
│   ├── controllers/      # Route controllers
│   ├── database/         # Database configuration
│   ├── lib/             # Utility libraries
│   ├── middleware/      # Custom middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Helper utilities
│   ├── validations/    # Request validations
│   ├── app.js          # Express app configuration
│   └── server.js       # Server entry point
├── uploads/            # File uploads (gitignored)
├── logs/              # Application logs (gitignored)
├── .gitignore
├── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- MongoDB Atlas account or local MongoDB installation

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cud004/quiz-app.git
   cd quiz-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration values.

4. **Start the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` (or your configured PORT).

## 🔧 Environment Variables

Required environment variables:
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: JWT token expiration time

Optional variables:
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `SESSION_SECRET`: Session secret for OAuth
- Payment gateway credentials (VNPay, MoMo)
- OAuth credentials (Google, GitHub)
- ImageKit configuration

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Quiz Management
- `GET /api/questions` - Get questions
- `POST /api/questions` - Create question (Admin)
- `GET /api/exams` - Get exams
- `POST /api/exams` - Create exam
- `POST /api/quiz-attempts` - Submit quiz attempt

### User Management
- `GET /api/users` - Get users (Admin)
- `PUT /api/users/profile` - Update profile

### Payment
- `POST /api/payments/vnpay` - Create VNPay payment
- `POST /api/payments/momo` - Create MoMo payment

### Analytics
- `GET /api/analytics/user` - User analytics
- `GET /api/system-analytics` - System analytics (Admin)

## 🔒 Security Features

- JWT Authentication
- Password Hashing with Bcrypt
- Rate Limiting
- CORS Configuration
- Helmet Security Headers
- XSS Protection
- Input Validation
- MongoDB Injection Prevention

## 🚀 Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start src/server.js --name "quiz-app"
pm2 startup
pm2 save
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For questions or support, please open an issue on GitHub.

---

**Happy Learning! 🎓**