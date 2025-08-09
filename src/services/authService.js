const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

class AuthService {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  static async comparePassword(enteredPassword, hashedPassword) {
    return await bcrypt.compare(enteredPassword, hashedPassword);
  }

  static async sendEmail(options) {
    if (!options || !options.email) {
      console.error('[AuthService] Invalid email options:', options);
      throw new Error('Invalid email options');
    }

    console.log('[AuthService] sendEmail starting with options:', {
      to: options.email,
      subject: options.subject,
      template: options.template,
      hasHtml: !!options.html,
      hasContext: !!options.context
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Xử lý template email nếu có
    let htmlContent = options.html;
    if (options.template && options.context) {
      console.log('[AuthService] Rendering email template:', {
        template: options.template,
        context: options.context
      });
      htmlContent = this.renderEmailTemplate(options.template, options.context);
    }

    const message = {
      from: `${process.env.FROM_NAME || 'Quiz App'} <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: htmlContent
    };

    // Log context gửi email để debug
    console.log('[AuthService] sendEmail called:', {
      to: message.to,
      subject: message.subject,
      template: options.template,
      context: options.context,
      from: message.from
    });

    try {
      await transporter.sendMail(message);
      console.log('[AuthService] sendEmail sent successfully:', {
        to: message.to,
        subject: message.subject
      });
    } catch (error) {
      console.error('[AuthService] Error sending email:', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        command: error.command
      });
      throw error;
    }
  }

  /**
   * Render template email dựa trên loại và dữ liệu
   * @param {string} templateName - Tên template
   * @param {object} context - Dữ liệu để render template
   * @returns {string} HTML content
   */
  static renderEmailTemplate(templateName, context) {
    switch (templateName) {
      case 'payment-success':
        return this.renderPaymentSuccessTemplate(context);
      case 'payment-failed':
        return this.renderPaymentFailedTemplate(context);
      default:
        return context.message || '';
    }
  }

  /**
   * Template email thanh toán thành công
   * @param {object} context - Dữ liệu để render template
   * @returns {string} HTML content
   */
  static renderPaymentSuccessTemplate(context) {
    const { name, packageName, amount, transactionId, paymentMethod, date } = context;
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hóa đơn thanh toán thành công</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
        .header { background-color: #4CAF50; padding: 20px; text-align: center; color: white; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; border: 1px solid #e9e9e9; border-radius: 0 0 5px 5px; border-top: none; }
        .button { display: inline-block; background-color: #4CAF50; color: #fff !important; text-decoration: none; padding: 12px 25px; border-radius: 4px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        .details { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px; }
        .details p { margin: 10px 0; }
        .success-icon { font-size: 48px; color: #4CAF50; text-align: center; margin: 20px 0; }
        @media only screen and (max-width: 600px) { .container { width: 100%; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hóa đơn thanh toán thành công</h1>
        </div>
        <div class="content">
          <div class="success-icon">✓</div>
          <p>Xin chào <b>${name || 'Quý khách'}</b>,</p>
          <p>Cảm ơn bạn đã thanh toán. Gói dịch vụ của bạn đã được kích hoạt thành công.</p>
          <div class="details">
            <p><strong>Gói đăng ký:</strong> ${packageName || 'Không có thông tin'}</p>
            <p><strong>Số tiền:</strong> ${amount || 'Không có thông tin'}</p>
            <p><strong>Mã giao dịch:</strong> ${transactionId || 'Không có thông tin'}</p>
            <p><strong>Phương thức thanh toán:</strong> ${paymentMethod || 'Không có thông tin'}</p>
            <p><strong>Thời gian:</strong> ${date || new Date().toLocaleString('vi-VN')}</p>
          </div>
          <p>Bạn có thể bắt đầu sử dụng các tính năng cao cấp ngay bây giờ.</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Truy cập tài khoản</a>
          </div>
          <p>Nếu bạn có bất kỳ câu hỏi nào về hóa đơn hoặc gói đăng ký, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Quiz App. Tất cả các quyền được bảo lưu.</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Template email thanh toán thất bại
   * @param {object} context - Dữ liệu để render template
   * @returns {string} HTML content
   */
  static renderPaymentFailedTemplate(context) {
    const { name, packageName, amount, transactionId, reason } = context;
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thanh toán thất bại</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background-color: #F44336;
          padding: 20px;
          text-align: center;
          color: white;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #e9e9e9;
          border-radius: 0 0 5px 5px;
          border-top: none;
        }
        .button {
          display: inline-block;
          background-color: #4CAF50;
          color: #fff !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .retry-button {
          display: inline-block;
          background-color: #2196F3;
          color: #fff !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          margin: 20px 10px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
        .details {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 8px;
        }
        .details p {
          margin: 10px 0;
        }
        .error-icon {
          font-size: 48px;
          color: #F44336;
          text-align: center;
          margin: 20px 0;
        }
        .error-reason {
          background-color: #FFEBEE;
          padding: 10px 15px;
          border-radius: 4px;
          margin: 15px 0;
          color: #D32F2F;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thanh toán thất bại</h1>
        </div>
        <div class="content">
          <div class="error-icon">✗</div>
          <p>Xin chào ${name || 'Quý khách'},</p>
          <p>Rất tiếc, giao dịch thanh toán của bạn không thành công.</p>
          
          <div class="details">
            <p><strong>Gói đăng ký:</strong> ${packageName || 'Không có thông tin'}</p>
            <p><strong>Số tiền:</strong> ${amount || 'Không có thông tin'}</p>
            <p><strong>Mã giao dịch:</strong> ${transactionId || 'Không có thông tin'}</p>
            <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            
            <div class="error-reason">
              <p><strong>Lý do:</strong> ${reason || 'Không xác định'}</p>
            </div>
          </div>
          
          <p>Bạn có thể thử lại thanh toán hoặc chọn phương thức thanh toán khác.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription" class="retry-button">Thử lại</a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/contact" class="button">Liên hệ hỗ trợ</a>
          </div>
          
          <p>Nếu bạn gặp khó khăn trong quá trình thanh toán, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi để được trợ giúp.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Quiz App. Tất cả các quyền được bảo lưu.</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  static async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu: ${resetUrl}`;
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đặt lại mật khẩu</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background-color: #4F46E5;
          padding: 20px;
          text-align: center;
          color: white;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #e9e9e9;
          border-radius: 0 0 5px 5px;
          border-top: none;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: #fff !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
        .warning {
          margin-top: 20px;
          padding: 10px;
          background-color: #FFF9C4;
          border-radius: 4px;
          font-size: 13px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Đặt lại mật khẩu</h1>
        </div>
        <div class="content">
          <p>Xin chào,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản Quiz App của bạn. Nhấp vào nút bên dưới để tiếp tục:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
          </div>
          
          <p>Nếu nút ở trên không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:</p>
          <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">${resetUrl}</p>
          
          <div class="warning">
            <p><strong>Lưu ý:</strong> Liên kết này chỉ có hiệu lực trong vòng 10 phút và chỉ có thể sử dụng một lần.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi nếu bạn có bất kỳ thắc mắc nào.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Quiz App. Tất cả các quyền được bảo lưu.</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
    `;
    console.log('[AuthService] sendPasswordResetEmail called:', { email });
    await this.sendEmail({
      email,
      subject: 'Đặt lại mật khẩu Quiz App',
      message,
      html
    });
    console.log('[AuthService] sendPasswordResetEmail sent successfully:', { email });
  }

  static async sendWelcomeEmail(email, name) {
    const message = `Chào mừng bạn đến với Quiz App, ${name}! Chúng tôi rất vui khi được chào đón bạn.`;
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chào mừng đến với Quiz App</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background-color: #4F46E5;
          padding: 20px;
          text-align: center;
          color: white;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #e9e9e9;
          border-radius: 0 0 5px 5px;
          border-top: none;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: #fff !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
        .feature-box {
          margin: 20px 0;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 8px;
        }
        .feature-box h3 {
          margin-top: 0;
          color: #4F46E5;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        .feature-item {
          text-align: center;
          padding: 15px 10px;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .feature-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
          .feature-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Chào mừng đến với Quiz App!</h1>
        </div>
        <div class="content">
          <p>Xin chào ${name},</p>
          <p>Chúng tôi rất vui khi bạn đã tham gia cùng Quiz App - nền tảng học tập và luyện thi hàng đầu Việt Nam.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}" class="button">Bắt đầu ngay</a>
          </div>
          
          <div class="feature-box">
            <h3>Bạn có thể bắt đầu với:</h3>
            <div class="feature-grid">
              <div class="feature-item">
                <div class="feature-icon">🧠</div>
                <p>Luyện thi</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📊</div>
                <p>Thống kê</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🏆</div>
                <p>Thành tích</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">👥</div>
                <p>Cộng đồng</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">📱</div>
                <p>Mobile App</p>
              </div>
              <div class="feature-item">
                <div class="feature-icon">🌐</div>
                <p>Truy cập mọi nơi</p>
              </div>
            </div>
          </div>
          
          <p>Cần hỗ trợ? Đừng ngần ngại liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Quiz App. Tất cả các quyền được bảo lưu.</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
    `;
    console.log('[AuthService] sendWelcomeEmail called:', { email, name });
    await this.sendEmail({
      email,
      subject: 'Chào mừng đến với Quiz App',
      message,
      html
    });
    console.log('[AuthService] sendWelcomeEmail sent successfully:', { email });
  }

  static async sendSubscriptionExpiryEmail(email, name, daysLeft) {
    const message = `Gói đăng ký của bạn sẽ hết hạn trong ${daysLeft} ngày. Gia hạn ngay để tiếp tục sử dụng các tính năng cao cấp.`;
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gói đăng ký sắp hết hạn</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          background-color: #FF6B00;
          padding: 20px;
          text-align: center;
          color: white;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          border: 1px solid #e9e9e9;
          border-radius: 0 0 5px 5px;
          border-top: none;
        }
        .button {
          display: inline-block;
          background-color: #FF6B00;
          color: #fff !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
        .countdown {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          color: #FF6B00;
          margin: 20px 0;
          padding: 15px;
          background-color: #FFF3E0;
          border-radius: 8px;
        }
        .benefits {
          margin: 20px 0;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        .benefits h3 {
          margin-top: 0;
          color: #FF6B00;
        }
        .benefits ul {
          padding-left: 20px;
        }
        .benefits li {
          margin-bottom: 10px;
        }
        @media only screen and (max-width: 600px) {
          .container {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Gói đăng ký sắp hết hạn</h1>
        </div>
        <div class="content">
          <p>Xin chào ${name},</p>
          
          <div class="countdown">
            Gói đăng ký của bạn sẽ hết hạn trong ${daysLeft} ngày
          </div>
          
          <p>Để đảm bảo bạn không bị gián đoạn trải nghiệm sử dụng, vui lòng gia hạn ngay hôm nay.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/subscription" class="button">Gia hạn ngay</a>
          </div>
          
          <div class="benefits">
            <h3>Tiếp tục tận hưởng các đặc quyền cao cấp:</h3>
            <ul>
              <li><strong>Không giới hạn bài thi</strong> - Truy cập tất cả các đề thi và bài luyện tập</li>
              <li><strong>Phân tích chuyên sâu</strong> - Theo dõi hiệu suất học tập chi tiết</li>
              <li><strong>Gợi ý cá nhân hóa</strong> - Nhận đề xuất học tập dựa trên điểm mạnh, điểm yếu</li>
              <li><strong>Hỗ trợ ưu tiên</strong> - Được hỗ trợ từ đội ngũ chuyên gia của chúng tôi</li>
              <li><strong>Không có quảng cáo</strong> - Trải nghiệm học tập không bị gián đoạn</li>
            </ul>
          </div>
          
          <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Quiz App. Tất cả các quyền được bảo lưu.</p>
          <p>Email này được gửi tự động, vui lòng không trả lời.</p>
        </div>
      </div>
    </body>
    </html>
    `;
    console.log('[AuthService] sendSubscriptionExpiryEmail called:', { email, name, daysLeft });
    await this.sendEmail({
      email,
      subject: 'Gói đăng ký của bạn sắp hết hạn',
      message,
      html
    });
    console.log('[AuthService] sendSubscriptionExpiryEmail sent successfully:', { email });
  }
}

module.exports = AuthService;
