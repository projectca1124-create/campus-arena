import { sendEmail } from './gmail'
import { userWaitlistEmail, adminWaitlistEmail } from './templates'

export async function sendWaitlistEmails({
  userName,
  userEmail,
}: {
  userName: string
  userEmail: string
}) {
  try {
    console.log('📧 Preparing to send emails...')
    
    await sendEmail({
      to: userEmail,
      ...userWaitlistEmail(userName)
    })

    console.log('✅ User email sent successfully!')

    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@campusarena.com',
      ...adminWaitlistEmail(userName, userEmail)
    })

    console.log('✅ Admin email sent successfully!')
    
    return true
  } catch (error) {
    console.error('❌ Email sending error:', error)
    throw error
  }
}