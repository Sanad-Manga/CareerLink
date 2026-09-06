const nodemailer = require('nodemailer');
const { OTP_EXPIRY_MINUTES } = require('../config/constants');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

const sendOtpEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"GIU Nexus" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Password Reset Code — GIU Nexus',
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td bgcolor="#1E40AF" style="background:linear-gradient(135deg,#1E40AF,#2563EB);padding:32px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 auto;">
              <tr>
                <td bgcolor="#3B5FBF" style="width:40px;height:40px;background:#3B5FBF;border-radius:10px;text-align:center;vertical-align:middle;font-size:15px;font-weight:800;color:#ffffff;font-family:Arial,sans-serif;">GN</td>
                <td style="width:10px;"></td>
                <td style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:Arial,sans-serif;white-space:nowrap;">GIU <span style="color:#34D399;">Nexus</span></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:14px;color:#64748B;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">Password Reset</p>
            <h1 style="margin:0 0 20px;font-size:26px;font-weight:800;color:#0F172A;letter-spacing:-0.5px;">Your one-time code</h1>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
              We received a request to reset your GIU Nexus password. Use the code below to continue. It expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="background:#F8FAFF;border:2px dashed #BFDBFE;border-radius:12px;padding:28px 20px;text-align:center;margin-bottom:28px;">
              <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#1E40AF;font-family:'Courier New',monospace;">${otp}</div>
              <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">Valid for ${OTP_EXPIRY_MINUTES} minutes</p>
            </div>

            <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:6px;padding:12px 16px;margin-bottom:28px;">
              <p style="margin:0;font-size:13px;color:#92400E;">
                <strong>Didn't request this?</strong> You can safely ignore this email. Your password won't change.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94A3B8;">
              © ${new Date().getFullYear()} GIU Nexus · AI-Powered Career Platform<br>
              German International University
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (err) {
    console.error(`Error sending OTP email: ${err.message}`);
    throw err;
  }
};

module.exports = {
  sendOtpEmail,
};
