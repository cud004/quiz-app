class PaymentService {
  static async createPayment(user, cart, paymentMethod) {
    const Payment = require('../../models/Payment');
    const User = require('../../models/User');

    // Tạo payment record
    const payment = new Payment({
      user: user._id,
      exams: cart.items.map(item => ({
        exam: item.exam,
        price: item.price
      })),
      totalAmount: cart.totalAmount,
      paymentMethod,
      transactionId: this.generateTransactionId(),
      status: 'pending'
    });

    // Lưu payment
    await payment.save();

    // Cập nhật purchasedExams trong user
    const examIds = cart.items.map(item => item.exam);
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { purchasedExams: { $each: examIds } }
    });

    return payment;
  }

  static generateTransactionId() {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  static async updatePaymentStatus(paymentId, status) {
    const Payment = require('../../models/Payment');
    return Payment.findByIdAndUpdate(
      paymentId,
      { 
        status,
        transactionTime: new Date()
      },
      { new: true }
    );
  }
}

module.exports = PaymentService; 