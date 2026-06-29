const nodemailer = require('nodemailer');

// Create transporter configuration from environment variables
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for others
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

let transporter = null;

// Initialize transporter if credentials are provided
if (smtpConfig.auth.user && smtpConfig.auth.pass) {
  try {
    transporter = nodemailer.createTransport(smtpConfig);
  } catch (error) {
    console.error('[Mailer Error] Failed to initialize Nodemailer transporter:', error);
  }
}

/**
 * Sends a registration email verification link to a user.
 * Falls back to logging the link to console if SMTP is not configured.
 * 
 * @param {string} toEmail - The recipient's email address
 * @param {string} userName - The recipient's name
 * @param {string} token - The user verification token
 * @returns {Promise<boolean>} Resolves with true if sent, false otherwise
 */
const sendVerificationEmail = async (toEmail, userName, token) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const verificationLink = `${backendUrl}/api/auth/verify?token=${token}`;

  // Log link to console for debugging/development fallback
  console.log(`[Signup] Verification link for user (${toEmail}): ${verificationLink}`);

  if (!transporter) {
    console.log('[Mailer Fallback] SMTP credentials not configured. Verification email was NOT sent, link logged to console.');
    return false;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Coinzy" <${smtpConfig.auth.user}>`,
    to: toEmail,
    subject: 'Verify Your Coinzy Account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eef2f5; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #6C6FE0; font-size: 28px; margin: 0 0 10px 0; font-weight: 700; letter-spacing: -0.5px;">Coinzy</h1>
          <p style="color: #64748b; font-size: 16px; margin: 0;">Smart Financial Management</p>
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <div style="color: #334155; font-size: 15px; line-height: 1.6;">
          <p style="font-size: 16px; font-weight: 600; margin-top: 0;">Hi ${userName},</p>
          <p>Welcome to Coinzy! We are excited to help you take control of your financial journey.</p>
          <p>To finalize your registration and secure your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #6C6FE0; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; transition: background-color 0.2s ease;">Verify My Account</a>
          </div>
          
          <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 13px; color: #6C6FE0; background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 10px 0;">
            <a href="${verificationLink}" style="color: #6C6FE0; text-decoration: none;">${verificationLink}</a>
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
        <div style="text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">If you did not sign up for a Coinzy account, please ignore this email.</p>
          <p style="margin: 0;">&copy; 2026 Coinzy. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Verification email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Mailer Error] Failed to send verification email to ${toEmail}:`, error.message);
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
};
