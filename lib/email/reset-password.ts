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
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Segoe UI, Roboto, sans-serif; background: #f9fafb; line-height: 1.5; color: #374151; }
    .wrapper { background: #f9fafb; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; text-align: center; }
    .logo-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.25); border-radius: 8px; display: inline-block; color: white; font-weight: bold; font-size: 22px; line-height: 44px; margin-right: 12px; }
    .logo-text { font-size: 26px; font-weight: bold; color: white; display: inline-block; vertical-align: middle; }
    .content { padding: 40px 30px; }
    .title { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 12px; text-align: center; line-height: 1.2; }
    .subtitle { font-size: 16px; color: #6b7280; text-align: center; margin-bottom: 30px; line-height: 1.6; }
    .email-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; border-radius: 6px; margin-bottom: 30px; }
    .email-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; display: block; }
    .email-value { font-size: 16px; color: #2563eb; font-weight: 600; }
    .button-wrapper { text-align: center; margin: 40px 0 30px 0; }
    .divider { height: 1px; background: #e5e7eb; margin: 30px 0; }
    .link-section { background: #f3f4f6; padding: 16px 20px; border-radius: 6px; margin-bottom: 30px; }
    .link-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: block; }
    .link-text { font-size: 13px; color: #2563eb; font-family: monospace; word-break: break-all; line-height: 1.5; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin-bottom: 30px; }
    .warning-title { font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 6px; }
    .warning-text { font-size: 13px; color: #78350f; line-height: 1.6; }
    .info-box { background: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
    .info-title { font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 8px; }
    .info-text { font-size: 13px; color: #6b7280; line-height: 1.6; }
    .footer { background: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer-text { font-size: 12px; color: #9ca3af; margin: 8px 0; }
    .footer-link { color: #2563eb; text-decoration: none; font-weight: 500; }
    a.button-link { background: #2563eb; color: white !important; display: inline-block; padding: 14px 40px; border-radius: 6px; text-decoration: none !important; font-weight: 600; font-size: 16px; mso-padding-alt: 14px 40px; }
    a.button-link:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-icon">CA</span><span class="logo-text">Campus Arena</span>
      </div>

      <div class="content">
        <h1 class="title">Reset Your Password</h1>
        <p class="subtitle">We received a request to reset your password. Click the button below to create a new password for your account.</p>

        <div class="email-box">
          <span class="email-label">Account Email</span>
          <div class="email-value">${email}</div>
        </div>

        <!-- BUTTON - SIMPLE VERSION FOR BETTER OUTLOOK SUPPORT -->
        <div class="button-wrapper">
          <a href="${resetLink}" class="button-link">Reset Password</a>
        </div>

        <div class="divider"></div>

       

        <div class="warning-box">
          <div class="warning-title">⏰ Link Expires in 1 Hour</div>
          <div class="warning-text">For security reasons, this reset link will expire in 1 hour. If you don't reset your password within this time, you'll need to request a new link.</div>
        </div>

        <div class="info-box">
          <div class="info-title">Didn't request this?</div>
          <div class="info-text">If you didn't request a password reset, your account is safe. You can ignore this email or contact our support team if you have concerns.</div>
        </div>

        <div class="info-box">
          <div class="info-title">Security Reminder</div>
          <div class="info-text">Never share your password reset link with anyone. Campus Arena staff will never ask for your password via email.</div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-text">© 2026 Campus Arena. All rights reserved.</div>
        <div class="footer-text">
          <a href="https://campusarena.co" class="footer-link">Campus Arena</a> • 
          <a href="https://campusarena.co/privacy" class="footer-link">Privacy</a> • 
          <a href="https://campusarena.co/contact" class="footer-link">Contact</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `,
    text: `Reset Your Password

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

Account Email: ${email}

⏰ Link Expires in 1 Hour
For security reasons, this reset link will expire in 1 hour.

Didn't request this?
If you didn't request a password reset, your account is safe.

Security Reminder
Never share this link with anyone. Campus Arena staff will never ask for your password.

© 2026 Campus Arena
https://campusarena.co`,
  }
}