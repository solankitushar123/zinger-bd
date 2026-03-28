const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  emailVerification: ({ name, verifyUrl }) => ({
    subject: 'Verify your email - ZINGER Grocery',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00b14f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">ZINGER Grocery</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${name}! 👋</h2>
          <p>Thanks for signing up. Please verify your email to get started.</p>
          <a href="${verifyUrl}" style="background: #00b14f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Verify Email
          </a>
          <p style="color: #666; font-size: 14px;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: ({ name, resetUrl }) => ({
    subject: 'Reset your password - ZINGER Grocery',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00b14f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">ZINGER Grocery</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${name},</h2>
          <p>You requested a password reset. Click the button below to set a new password.</p>
          <a href="${resetUrl}" style="background: #00b14f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      </div>
    `,
  }),

  orderConfirmation: ({ name, order }) => ({
    subject: `Order Confirmed #${order.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #00b14f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Order Confirmed! 🎉</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Hi ${name},</h2>
          <p>Your order <strong>#${order.orderId}</strong> has been placed successfully!</p>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Summary</h3>
            ${order.items.map(item => `
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span>${item.name} × ${item.quantity}</span>
                <span>₹${item.total}</span>
              </div>
            `).join('')}
            <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid #ddd;">
              <strong>Total: ₹${order.totalAmount}</strong>
            </div>
          </div>
          <p>Estimated delivery: <strong>30 minutes</strong></p>
        </div>
      </div>
    `,
  }),
};

const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const templateContent = template && templates[template] ? templates[template](data) : { subject, html };

    await transporter.sendMail({
      from: `"ZINGER Grocery" <${process.env.EMAIL_FROM}>`,
      to,
      subject: templateContent.subject || subject,
      html: templateContent.html || html,
    });
  } catch (error) {
    console.error('Email send failed:', error.message);
    // Don't throw — email failures shouldn't break the app
  }
};

module.exports = { sendEmail };
