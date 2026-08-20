const nodemailer = require('nodemailer');
const serverConfig = require('./server.config');

// ─── Email Transport Strategy ───────────────────────────────────────
// Brevo HTTP API (port 443) for production — works on Render/Vercel
// SMTP fallback for local development
const useBrevoAPI = !!serverConfig.BREVO_API_KEY;

console.log('[EMAIL] Mode:', useBrevoAPI ? 'Brevo HTTP API' : 'SMTP');
if (useBrevoAPI) {
    const k = serverConfig.BREVO_API_KEY;
    console.log('[EMAIL] API Key debug:', { prefix: k.substring(0, 10), length: k.length, trimmedLength: k.trim().length });
}

// SMTP transporter (local dev fallback)
const transporter = nodemailer.createTransport({
    host: serverConfig.SMTP_HOST,
    port: Number(serverConfig.SMTP_PORT),
    secure: false,
    auth: {
        user: serverConfig.SMTP_USER,
        pass: serverConfig.SMTP_PASS,
    },
});

/**
 * Send email via Brevo HTTP API (uses HTTPS port 443 — never blocked)
 */
const sendViaBrevoAPI = async (toEmail, subject, htmlContent) => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': serverConfig.BREVO_API_KEY.trim(),
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: serverConfig.SMTP_FROM_NAME,
                email: serverConfig.SMTP_FROM_EMAIL,
            },
            to: [{ email: toEmail }],
            subject,
            htmlContent,
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Brevo API error ${res.status}: ${err.message || JSON.stringify(err)}`);
    }

    return res.json();
};

/**
 * Universal send email — picks the right transport
 */
const sendEmail = async (toEmail, subject, html) => {
    if (useBrevoAPI) {
        return sendViaBrevoAPI(toEmail, subject, html);
    }
    // SMTP fallback (local dev)
    const mailOptions = {
        from: `"${serverConfig.SMTP_FROM_NAME}" <${serverConfig.SMTP_FROM_EMAIL}>`,
        to: toEmail,
        subject,
        html,
    };
    return transporter.sendMail(mailOptions);
};

// ─── Shared Email Wrapper ───────────────────────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!--[if mso]>
  <style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#F1F0F6; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; -webkit-font-smoothing:antialiased;">
  
  <!-- Outer spacer -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F0F6;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Main card -->
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px; width:100%; background-color:#FFFFFF; border-radius:20px; overflow:hidden; box-shadow:0 8px 40px rgba(91,91,214,0.08), 0 1px 4px rgba(0,0,0,0.04);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#2D2B55; padding:36px 40px 30px; text-align:center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="width:50px; height:50px; background-color:rgba(255,255,255,0.12); border-radius:14px; display:inline-block; line-height:50px; font-size:24px;">📦</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:14px;">
                    <h1 style="margin:0; color:#FFFFFF; font-size:24px; font-weight:800; letter-spacing:-0.5px;">CampusCrate</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:6px;">
                    <p style="margin:0; color:rgba(255,255,255,0.55); font-size:11px; text-transform:uppercase; letter-spacing:2.5px; font-weight:600;">Campus Resource Exchange</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px; background-color:#EEEDF5;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px; text-align:center;">
              <p style="margin:0 0 6px; color:#A09CB2; font-size:11px; line-height:1.7;">
                This is an automated message from CampusCrate.<br/>
                Please do not reply to this email.
              </p>
              <p style="margin:0; color:#C7C4D6; font-size:10px;">
                &copy; ${new Date().getFullYear()} CampusCrate &middot; All rights reserved.
              </p>
            </td>
          </tr>
        </table>

        <!-- Bottom branding -->
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px; width:100%;">
          <tr>
            <td align="center" style="padding:20px 0 0;">
              <p style="margin:0; color:#B0ADBE; font-size:10px; letter-spacing:0.5px;">
                Sent with ❤️ from the CampusCrate team
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
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
        ? 'Verify your email — CampusCrate'
        : 'Your login code — CampusCrate';

    const heading = purpose === 'signup'
        ? 'Verify Your Email'
        : 'Login Verification';

    const purposeText = purpose === 'signup'
        ? "Welcome to CampusCrate! Use the verification code below to confirm your email address and activate your account."
        : "Use the code below to securely log into your CampusCrate account.";

    const otpDigits = otp.toString().split('').map(d =>
        `<td align="center" style="width:44px; height:52px; background-color:#F5F3FF; border:1.5px solid #E0DDEF; border-radius:10px; font-size:24px; font-weight:800; color:#2D2B55; font-family:'Segoe UI',Roboto,monospace; letter-spacing:0;">${d}</td>`
    ).join('<td style="width:8px;"></td>');

    const content = `
      <h2 style="margin:0 0 8px; color:#1E1B3A; font-size:21px; font-weight:700; letter-spacing:-0.3px;">
        ${heading}
      </h2>
      <p style="margin:0 0 28px; color:#6B6880; font-size:14px; line-height:1.7;">
        ${purposeText}
      </p>

      <!-- OTP Code Box -->
      <div style="background-color:#FAFAFF; border:1px solid #EEEDF5; border-radius:16px; padding:28px 20px; margin:0 0 28px; text-align:center;">
        <p style="margin:0 0 14px; color:#9793A8; font-size:11px; text-transform:uppercase; letter-spacing:2.5px; font-weight:700;">Verification Code</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
          <tr>
            ${otpDigits}
          </tr>
        </table>
      </div>

      <!-- Warning callout -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="background-color:#FFF9F0; border:1px solid #F5E6CE; border-radius:12px; padding:14px 18px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:top; padding-right:10px; font-size:16px;">⏱</td>
                <td style="color:#7A5D2E; font-size:13px; line-height:1.55;">
                  This code expires in <strong>10 minutes</strong>. Never share this code with anyone — CampusCrate will never ask for it.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0; color:#A09CB2; font-size:12px; text-align:center; line-height:1.6;">
        If you didn't request this, you can safely ignore this email.
      </p>
    `;

    const html = emailWrapper(content);
    await sendEmail(toEmail, subject, html);
};

/**
 * Send account suspension email to user
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User's display name
 */
const sendSuspensionEmail = async (toEmail, userName) => {
    const subject = 'Account suspended — CampusCrate';

    const content = `
      <h2 style="margin:0 0 8px; color:#1E1B3A; font-size:21px; font-weight:700; letter-spacing:-0.3px;">
        Account Suspended
      </h2>
      <p style="margin:0 0 28px; color:#6B6880; font-size:14px; line-height:1.7;">
        Hi <strong style="color:#1E1B3A;">${userName}</strong>, your CampusCrate account has been suspended by an administrator.
      </p>

      <!-- Status card -->
      <div style="background-color:#FDF2F2; border:1px solid #F5D5D5; border-radius:16px; padding:28px 24px; text-align:center; margin:0 0 28px;">
        <div style="width:52px; height:52px; background-color:#FEE2E2; border-radius:50%; display:inline-block; line-height:52px; font-size:24px; margin-bottom:12px;">🚫</div>
        <h3 style="margin:0 0 8px; color:#991B1B; font-size:16px; font-weight:700;">Access Restricted</h3>
        <p style="margin:0; color:#7F1D1D; font-size:13px; line-height:1.6;">
          You will not be able to log in or access<br/>platform features until your account is reinstated.
        </p>
      </div>

      <!-- Info callout -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
        <tr>
          <td style="background-color:#F0F4FE; border:1px solid #D6DEF5; border-radius:12px; padding:14px 18px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:top; padding-right:10px; font-size:16px;">💬</td>
                <td style="color:#2E3F6E; font-size:13px; line-height:1.55;">
                  If you believe this is a mistake, please contact us at <strong>${serverConfig.SMTP_FROM_EMAIL}</strong> for assistance.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0; color:#A09CB2; font-size:12px; text-align:center; line-height:1.6;">
        This action was taken to maintain community safety and trust.
      </p>
    `;

    const html = emailWrapper(content);
    await sendEmail(toEmail, subject, html);
};

/**
 * Send account reactivation email to user
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User's display name
 */
const sendReactivationEmail = async (toEmail, userName) => {
    const subject = 'Welcome back! Your account is active — CampusCrate';

    const content = `
      <h2 style="margin:0 0 8px; color:#1E1B3A; font-size:21px; font-weight:700; letter-spacing:-0.3px;">
        Account Reactivated
      </h2>
      <p style="margin:0 0 28px; color:#6B6880; font-size:14px; line-height:1.7;">
        Hi <strong style="color:#1E1B3A;">${userName}</strong>, great news! Your CampusCrate account has been reactivated by an administrator.
      </p>

      <!-- Status card -->
      <div style="background-color:#F0FAF4; border:1px solid #C6EDD5; border-radius:16px; padding:28px 24px; text-align:center; margin:0 0 28px;">
        <div style="width:52px; height:52px; background-color:#DCFCE7; border-radius:50%; display:inline-block; line-height:52px; font-size:24px; margin-bottom:12px;">✅</div>
        <h3 style="margin:0 0 8px; color:#166534; font-size:16px; font-weight:700;">Access Restored</h3>
        <p style="margin:0; color:#15803D; font-size:13px; line-height:1.6;">
          You can now log in and use all platform<br/>features just like before.
        </p>
      </div>

      <!-- CTA button -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
        <tr>
          <td align="center">
            <a href="#" style="display:inline-block; background-color:#2D2B55; color:#FFFFFF; text-decoration:none; padding:14px 36px; border-radius:12px; font-size:14px; font-weight:700; letter-spacing:0.2px;">
              Open CampusCrate
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0; color:#A09CB2; font-size:12px; text-align:center; line-height:1.6;">
        Welcome back to the CampusCrate community! We're glad to have you.
      </p>
    `;

    const html = emailWrapper(content);
    await sendEmail(toEmail, subject, html);
};

module.exports = { sendOtpEmail, sendSuspensionEmail, sendReactivationEmail, transporter };
