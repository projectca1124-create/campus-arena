export const userContactConfirmationEmail = (name: string) => ({
  subject: '✅ We received your message!',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 20px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }
          .content p { margin: 12px 0; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #1e40af; border-radius: 4px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>We Got Your Message! ✅</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>Thanks for reaching out to Campus Arena! We've received your message and our team will review it shortly.</p>
            
            <div class="message-box">
              <p><strong>What happens next:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>We'll read your message carefully</li>
                <li>Someone from our team will get back to you within 24 hours</li>
                <li>If you have urgent questions, feel free to <a href="mailto:projectca1124@gmail.com" style="color: #1e40af; text-decoration: none; font-weight: 500;">send an email</a></li>
              </ul>
            </div>
            
            <p>We really appreciate your feedback and suggestions - they help us build Campus Arena better every day.</p>
            
            <p style="margin-top: 25px; font-weight: bold;">Thanks for being part of our community!</p>
            <p style="margin: 5px 0; color: #666;">The Campus Arena Team</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Campus Arena. All rights reserved.</p>
            <p>You're receiving this because you submitted a contact form on our website.</p>
          </div>
        </div>
      </body>
    </html>
  `
})

export const adminContactNotificationEmail = (name: string, email: string, message: string) => ({
  subject: `📧 New Contact Message from ${name}`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .info-box { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e40af; }
          .info-box p { margin: 8px 0; font-size: 14px; }
          .info-box strong { color: #1e40af; }
          .message-section { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 20px 0; }
          .message-section h3 { margin: 0 0 15px 0; color: #1e40af; }
          .message-content { background: #f9fafb; padding: 15px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .reply-note { background: #fef3c7; padding: 12px; border-radius: 4px; margin: 15px 0; font-size: 13px; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Message</h1>
          </div>
          
          <div class="info-box">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Received:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="message-section">
            <h3>Message:</h3>
            <div class="message-content">${message}</div>
          </div>
          
          <div class="reply-note">
            💬 <strong>Reply:</strong> Click reply to send a direct response to ${email}
          </div>
          
          <div class="footer">
            <p>© 2024 Campus Arena.</p>
            <p>This is an automated notification from Campus Arena contact form.</p>
          </div>
        </div>
      </body>
    </html>
  `
})