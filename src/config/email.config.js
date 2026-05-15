const nodemailer = require('nodemailer');
const serverConfig = require('./server.config');

const transporter = nodemailer.createTransport({
    host: serverConfig.SMTP_HOST,
    port: Number(serverConfig.SMTP_PORT),
    secure: false, // Brevo uses STARTTLS on port 587
    auth: {
        user: serverConfig.SMTP_USER,
        pass: serverConfig.SMTP_PASS,
    },
});

/**
 * Send OTP email to user
 * @param {string} toEmail - Recipient email
 * @param {string} otp - The OTP code
 * @param {string} purpose - 'signup' | 'login'
 */
const sendOtpEmail = async (toEmail, otp, purpose = 'signup') => {
    const subject = purpose === 'signup'
        ? 'CampusCrate - Verify Your Email'
        : 'CampusCrate - Login OTP';

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
        <div style="background: #ffffff; border-radius: 12px; padding: 40px; text-align: center;">
            <h1 style="color: #333; margin: 0 0 8px 0; font-size: 24px;">📦 CampusCrate</h1>
            <p style="color: #888; margin: 0 0 30px 0; font-size: 14px;">
                ${purpose === 'signup' ? 'Verify your email to get started' : 'Use this OTP to login'}
            </p>
            <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="color: #888; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your OTP Code</p>
                <h2 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: 700;">${otp}</h2>
            </div>
            <p style="color: #999; font-size: 13px; margin: 20px 0 0 0;">
                This code expires in <strong>10 minutes</strong>.<br/>
                Do not share this code with anyone.
            </p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"${serverConfig.SMTP_FROM_NAME}" <${serverConfig.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, transporter };
