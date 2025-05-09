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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html
    };

    await transporter.sendMail(message);
  }

  static async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await this.sendEmail({
      email,
      subject: 'Password reset token',
      message,
      html
    });
  }

  static async sendWelcomeEmail(email, name) {
    const message = `Welcome to our platform, ${name}! We're excited to have you on board.`;
    const html = `
      <h1>Welcome to Our Platform!</h1>
      <p>Hello ${name},</p>
      <p>We're excited to have you on board. Get started by exploring our features:</p>
      <ul>
        <li>Take practice exams</li>
        <li>Track your progress</li>
        <li>Join study groups</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
    `;

    await this.sendEmail({
      email,
      subject: 'Welcome to Our Platform',
      message,
      html
    });
  }

  static async sendSubscriptionExpiryEmail(email, name, daysLeft) {
    const message = `Your subscription will expire in ${daysLeft} days. Renew now to continue enjoying our premium features.`;
    const html = `
      <h1>Subscription Expiring Soon</h1>
      <p>Hello ${name},</p>
      <p>Your subscription will expire in ${daysLeft} days.</p>
      <p>Renew now to continue enjoying our premium features:</p>
      <ul>
        <li>Access to premium exams</li>
        <li>Detailed performance analytics</li>
        <li>Priority support</li>
      </ul>
      <a href="${process.env.FRONTEND_URL}/subscription">Renew Subscription</a>
    `;

    await this.sendEmail({
      email,
      subject: 'Subscription Expiring Soon',
      message,
      html
    });
  }
}

module.exports = AuthService;
