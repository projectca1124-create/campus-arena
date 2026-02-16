// lib/email/templates.ts

export const userWaitlistEmail = (name: string) => ({
  subject: '🎉 Welcome to Campus Arena Waitlist!',
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
          .content h2 { color: #1e40af; margin-top: 20px; }
          .content ul { margin: 10px 0; }
          .content li { margin: 8px 0; }
          .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Campus Arena! 🎉</h1>
          </div>
          
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>Thanks for joining our waitlist! You're about to be part of something amazing.</p>
            
            <h2>What's Next?</h2>
            <ul>
              <li>✅ You'll get early access on <strong>March 1st</strong></li>
              <li>✅ Be among the first to connect with your classmates</li>
              <li>✅ Ask seniors anything about campus life</li>
              <li>✅ Build your network before orientation</li>
            </ul>
            
            <p>Mark your calendar for <strong>March 1st</strong> - that's when Campus Arena launches exclusively for your campus!</p>
            
            <h2>In the Meantime...</h2>
            <p>Tell your friends about Campus Arena! The more students from your campus join, the better the community will be.</p>
            
            <p style="margin-top: 30px; font-weight: bold;">We can't wait to see you there!</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Campus Arena. All rights reserved.</p>
            <p>You're receiving this because you signed up for our waitlist.</p>
            <p>Questions? Reply to this email anytime.</p>
          </div>
        </div>
      </body>
    </html>
  `
})

export const adminWaitlistEmail = (name: string, email: string) => ({
  subject: `📊 New Waitlist Signup: ${name}`,
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .info-box { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e40af; }
          .info-box p { margin: 10px 0; font-size: 14px; }
          .info-box strong { color: #1e40af; }
          .stats { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 New Waitlist Signup</h1>
          </div>
          
          <div class="info-box">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Joined:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p>A new user has joined the Campus Arena waitlist!</p>
          
          <div class="stats">
            <p style="margin: 0; font-weight: bold;">Keep tracking signups and manage them from your dashboard.</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Campus Arena.</p>
            <p>This is an automated notification from Campus Arena admin system.</p>
          </div>
        </div>
      </body>
    </html>
  `
})