# Quiz App API

API backend cho ứng dụng trắc nghiệm (Quiz App) sử dụng Node.js, Express và MongoDB.

## Chuẩn bị môi trường

1. **Cài đặt các phụ thuộc**:
   ```bash
   npm install
   ```

2. **Tạo file môi trường**:
   Tạo file `.env` trong thư mục gốc với nội dung sau:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/quiz-app
   JWT_SECRET=your_secret_key
   JWT_EXPIRE=30d
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_EMAIL=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   FROM_NAME=Quiz App
   FROM_EMAIL=noreply@quiz-app.com
   
   # VNPAY Configuration
   VNPAY_TMN_CODE=EXAMPLE12345
   VNPAY_HASH_SECRET=ABCDEFGHIJKLMNOPQRSTUVWXYZ123456
   VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
   VNPAY_API=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
   VNPAY_RETURN_URL=/api/vnpay/return

   # MOMO Configuration
   MOMO_PARTNER_CODE=MOMOXXX20220717
   MOMO_ACCESS_KEY=M8brj9K6E22vXoDB
   MOMO_SECRET_KEY=nqQiVSgDMy809JoPF6OzP5OdBUB550Y4
   MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
   MOMO_REDIRECT_URL=/api/momo/result
   MOMO_IPN_URL=/api/momo/ipn
   ```

## Khởi động ứng dụng

1. **Khởi động trong chế độ development**:
   ```bash
   npm run dev
   ```

2. **Khởi động trong chế độ production**:
   ```bash
   npm start
   ```

## Tích hợp với Frontend

API đã được chuẩn bị sẵn sàng để tích hợp với frontend với những cải tiến sau:

1. **Cấu hình CORS**:
   - CORS đã được cấu hình để cho phép frontend kết nối với API
   - Hỗ trợ nhiều origin khác nhau qua whitelist
   - Tự động cho phép mọi origin trong môi trường development

2. **Định dạng Response Chuẩn**:
   - Tất cả API đều trả về định dạng response chuẩn
   - Mỗi response đều có các trường: `success`, `message` và `data`
   - Các response lỗi có thêm trường `errors` (nếu có)

## Kiểm tra tích hợp

Bạn có thể kiểm tra cấu hình CORS và định dạng response bằng script kiểm tra đã cung cấp:

1. **Đảm bảo API đã chạy**:
   ```bash
   npm run dev
   ```

2. **Chạy script kiểm tra**:
   ```bash
   node test-cors-response.js
   ```

Script sẽ kiểm tra:
- Cấu hình CORS và các header liên quan
- Định dạng của response từ các endpoint khác nhau
- Xử lý lỗi theo định dạng chuẩn

## API Documentation

### Auth Routes
- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại
- `PUT /api/auth/profile` - Cập nhật hồ sơ người dùng
- `PUT /api/auth/password` - Cập nhật mật khẩu
- `POST /api/auth/forgot-password` - Yêu cầu đặt lại mật khẩu
- `POST /api/auth/reset-password` - Đặt lại mật khẩu với token

### User Routes
- `GET /api/users` - Lấy danh sách người dùng (Admin)
- `GET /api/users/:id` - Lấy thông tin người dùng (Admin)
- `POST /api/users` - Tạo người dùng mới (Admin)
- `PUT /api/users/:id` - Cập nhật người dùng (Admin)
- `DELETE /api/users/:id` - Xóa người dùng (Admin)

### Subscription Routes
- `GET /api/subscriptions` - Lấy tất cả gói đăng ký
- `GET /api/subscriptions/my-subscription` - Lấy thông tin gói đăng ký của người dùng hiện tại
- `POST /api/subscriptions/subscribe/:packageId` - Đăng ký gói mới

### Payment Routes
- `POST /api/payments/create` - Tạo phiên thanh toán mới
- `GET /api/payments/history` - Lấy lịch sử thanh toán

### VNPay Routes
- `GET /api/payments/vnpay/return` - Xử lý callback từ VNPay
- `POST /api/payments/vnpay/create` - Tạo phiên thanh toán VNPay

### MoMo Routes
- `POST /api/payments/momo/notify` - Xử lý callback từ MoMo
- `POST /api/payments/momo/create` - Tạo phiên thanh toán MoMo

## Phát triển tiếp theo

Các phần cần phát triển tiếp theo:
- ✅ Tích hợp email cho chức năng quên mật khẩu
- Hoàn thiện tích hợp thanh toán MoMo và VNPay
- Phát triển dashboard admin
- Tối ưu hiệu suất API 

## Cấu hình Email

Để cấu hình chức năng gửi email, bạn cần:

1. **Gmail App Password**: 
   - Đăng nhập vào tài khoản Google của bạn
   - Truy cập [Bảo mật Google](https://myaccount.google.com/security)
   - Bật xác thực 2 bước (nếu chưa)
   - Truy cập [Mật khẩu ứng dụng](https://myaccount.google.com/apppasswords)
   - Tạo mật khẩu ứng dụng mới cho "Mail" và "Khác" (Quiz App)
   - Sử dụng mật khẩu ứng dụng này cho biến `SMTP_PASSWORD` trong file .env

2. **Cấu hình trong file .env**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_EMAIL=your-gmail@gmail.com
   SMTP_PASSWORD=your-app-password
   FROM_NAME=Quiz App
   FROM_EMAIL=your-gmail@gmail.com
   ```

3. **Chức năng email hiện có**:
   - Gửi email quên mật khẩu 
   - Gửi email chào mừng người dùng mới
   - Gửi thông báo sắp hết hạn gói đăng ký 