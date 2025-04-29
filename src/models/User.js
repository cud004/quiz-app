const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, // Loại bỏ khoảng trắng thừa
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'], // Kiểm tra định dạng email
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // Đảm bảo mật khẩu có ít nhất 6 ký tự
  },
  profileImage: {
    type: String,
    validate: {
      validator: function (v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/.test(v); // Kiểm tra URL hợp lệ
      },
      message: 'Invalid profile image URL',
    },
  },
  class: {
    type: String,
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  purchasedExams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
    },

  ],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
},

  {
    timestamps: true,
  });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);