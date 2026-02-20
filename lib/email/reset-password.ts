// lib/email-templates/reset-password.ts

export function getResetPasswordEmailTemplate(email: string, resetLink: string) {
  return {
    subject: 'Reset Your Campus Arena Password',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 24px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: bold;
      color: white;
    }
    .content {
      padding: 40px 30px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 16px;
      text-align: center;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      text-align: center;
      margin-bottom: 30px;
    }
    .section {
      margin: 30px 0;
    }
    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .email-box {
      background-color: #eff6ff;
      border-left: 4px solid #2563eb;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .email-label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .email-value {
      font-size: 16px;
      color: #2563eb;
      font-weight: 600;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .reset-button {
      display: inline-block;
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 16px 48px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .reset-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
    }
    .description-text {
      font-size: 14px;
      color: #666;
      text-align: center;
      margin-bottom: 20px;
    }
    .link-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 16px;
      border-radius: 4px;
      margin-top: 20px;
      word-break: break-all;
    }
    .link-label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .link-text {
      font-size: 12px;
      color: #2563eb;
      font-family: 'Courier New', monospace;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .warning-icon {
      display: inline-block;
      margin-right: 8px;
    }
    .warning-text {
      font-size: 13px;
      color: #92400e;
      font-weight: 500;
    }
    .info-box {
      background-color: #f3f4f6;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .info-title {
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .info-text {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      font-size: 12px;
      color: #999;
      margin: 8px 0;
    }
    .footer-link {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    .footer-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <div class="logo-icon">CA</div>
        <div class="logo-text">Campus Arena</div>
      </div>
    </div>

    <div class="content">
      <div class="title">Reset Your Password</div>
      <div class="subtitle">We received a request to reset your password. Click the button below to create a new password.</div>

      <div class="section">
        <div class="section-label">Email Address</div>
        <div class="email-box">
          <div class="email-label">Account Email</div>
          <div class="email-value">${email}</div>
        </div>
      </div>

      <div class="button-container">
        <div class="description-text">Click the button below to reset your password:</div>
        <a href="${resetLink}" class="reset-button">Reset Password</a>
      </div>

      <div class="section">
        <div class="section-label">Alternative Link</div>
        <div class="link-box">
          <div class="link-label">Or copy and paste this link in your browser:</div>
          <div class="link-text">${resetLink}</div>
        </div>
      </div>

      <div class="warning-box">
        <span class="warning-icon">⏰</span>
        <span class="warning-text"><strong>This link will expire in 1 hour.</strong> If you don't reset your password within this time, you'll need to request a new reset link.</span>
      </div>

      <div class="divider"></div>

      <div class="info-box">
        <div class="info-title">Didn't request this?</div>
        <div class="info-text">If you didn't request a password reset, you can ignore this email. Your account is safe and secure.</div>
      </div>

      <div class="info-box">
        <div class="info-title">Security Tip</div>
        <div class="info-text">Never share this link with anyone. Campus Arena staff will never ask for your password or reset link via email.</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">© 2024 Campus Arena. All rights reserved.</div>
      <div class="footer-text">
        <a href="https://campusarena.co" class="footer-link">Visit Campus Arena</a> | 
        <a href="https://campusarena.co/privacy" class="footer-link">Privacy Policy</a> | 
        <a href="https://campusarena.co/contact" class="footer-link">Contact Us</a>
      </div>
    </div>
  </div>
</body>
</html>
    `,
    text: `
RESET YOUR PASSWORD

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

IMPORTANT INFORMATION:
- This link will expire in 1 hour
- If you didn't request this, you can ignore this email
- Never share this link with anyone
- Campus Arena staff will never ask for your password via email

Email: ${email}

© 2026 Campus Arena. All rights reserved.
Visit: https://campusarena.co
    `,
  }
}