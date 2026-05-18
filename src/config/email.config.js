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

// ─── Shared Email Wrapper ───────────────────────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background:#f1f5f9; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:560px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 50%,#818cf8 100%); padding:32px 40px; text-align:center;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <div style="width:44px; height:44px; background:rgba(255,255,255,0.2); border-radius:12px; display:inline-block; line-height:44px; font-size:22px;">📦</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:12px;">
            <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">CampusCrate</h1>
            <p style="margin:4px 0 0; color:rgba(255,255,255,0.75); font-size:12px; text-transform:uppercase; letter-spacing:1.5px;">Campus Resource Exchange</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px 40px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 40px; text-align:center;">
      <p style="margin:0; color:#94a3b8; font-size:11px; line-height:1.6;">
        This is an automated message from CampusCrate.<br/>
        Please do not reply to this email.
      </p>
      <p style="margin:8px 0 0; color:#cbd5e1; font-size:10px;">
        &copy; ${new Date().getFullYear()} CampusCrate. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
`;

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

    const purposeText = purpose === 'signup'
        ? 'Welcome! Use the code below to verify your email and get started.'
        : 'Use the code below to securely log into your account.';

    const content = `
      <h2 style="margin:0 0 8px; color:#0f172a; font-size:20px; font-weight:700;">
        ${purpose === 'signup' ? 'Verify Your Email' : 'Login Verification'}
      </h2>
      <p style="margin:0 0 28px; color:#64748b; font-size:14px; line-height:1.6;">
        ${purposeText}
      </p>

      <div style="background:#f8fafc; border:2px dashed #c7d2fe; border-radius:14px; padding:24px; text-align:center; margin:0 0 28px;">
        <p style="margin:0 0 6px; color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:2px; font-weight:600;">Your Verification Code</p>
        <h2 style="margin:0; color:#4f46e5; font-size:38px; letter-spacing:10px; font-weight:800;">${otp}</h2>
      </div>

      <div style="background:#fffbeb; border-left:4px solid #f59e0b; border-radius:0 8px 8px 0; padding:12px 16px; margin:0 0 24px;">
        <p style="margin:0; color:#92400e; font-size:13px; line-height:1.5;">
          ⏱ This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>

      <p style="margin:0; color:#94a3b8; font-size:12px; text-align:center;">
        If you didn't request this, you can safely ignore this email.
      </p>
    `;

    const html = emailWrapper(content);

    const mailOptions = {
        from: `"${serverConfig.SMTP_FROM_NAME}" <${serverConfig.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send account suspension email to user
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User's display name
 */
const sendSuspensionEmail = async (toEmail, userName) => {
    const subject = 'CampusCrate - Account Suspended';

    const content = `
      <h2 style="margin:0 0 8px; color:#0f172a; font-size:20px; font-weight:700;">
        Account Suspended
      </h2>
      <p style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.6;">
        Hi <strong>${userName}</strong>, your CampusCrate account has been suspended by an administrator.
      </p>

      <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:24px; text-align:center; margin:0 0 28px;">
        <div style="font-size:36px; margin-bottom:8px;">🚫</div>
        <h3 style="margin:0 0 8px; color:#dc2626; font-size:16px; font-weight:700;">Access Restricted</h3>
        <p style="margin:0; color:#991b1b; font-size:13px; line-height:1.5;">
          You will not be able to log in or access platform features until your account is reinstated.
        </p>
      </div>

      <div style="background:#f0f9ff; border-left:4px solid #3b82f6; border-radius:0 8px 8px 0; padding:12px 16px; margin:0 0 24px;">
        <p style="margin:0; color:#1e40af; font-size:13px; line-height:1.5;">
          💬 If you believe this is a mistake, please contact the admin at <strong>${serverConfig.SMTP_FROM_EMAIL}</strong> for assistance.
        </p>
      </div>

      <p style="margin:0; color:#94a3b8; font-size:12px; text-align:center;">
        This action was taken to maintain community safety.
      </p>
    `;

    const html = emailWrapper(content);

    const mailOptions = {
        from: `"${serverConfig.SMTP_FROM_NAME}" <${serverConfig.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send account reactivation email to user
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User's display name
 */
const sendReactivationEmail = async (toEmail, userName) => {
    const subject = 'CampusCrate - Account Reactivated';

    const content = `
      <h2 style="margin:0 0 8px; color:#0f172a; font-size:20px; font-weight:700;">
        Account Reactivated! 🎉
      </h2>
      <p style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.6;">
        Hi <strong>${userName}</strong>, great news! Your CampusCrate account has been reactivated by an administrator.
      </p>

      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:24px; text-align:center; margin:0 0 28px;">
        <div style="font-size:36px; margin-bottom:8px;">✅</div>
        <h3 style="margin:0 0 8px; color:#16a34a; font-size:16px; font-weight:700;">Access Restored</h3>
        <p style="margin:0; color:#15803d; font-size:13px; line-height:1.5;">
          You can now log in and use all platform features as before.
        </p>
      </div>

      <p style="margin:0; color:#94a3b8; font-size:12px; text-align:center;">
        Welcome back to the CampusCrate community!
      </p>
    `;

    const html = emailWrapper(content);

    const mailOptions = {
        from: `"${serverConfig.SMTP_FROM_NAME}" <${serverConfig.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, sendSuspensionEmail, sendReactivationEmail, transporter };
