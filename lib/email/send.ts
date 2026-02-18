import { Resend } from 'resend'
import { userWaitlistEmail, adminWaitlistEmail } from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWaitlistEmails({
  userName,
  userEmail,
}: {
  userName: string
  userEmail: string
}) {
  try {
    console.log('📧 Preparing to send emails...')
    
    // Send email to user
    const userEmailResponse = await resend.emails.send({
      from: 'noreply@campusarena.co', // ✅ Changed to your domain!
      to: userEmail,
      ...userWaitlistEmail(userName)
    })

    if (userEmailResponse.error) {
      throw new Error(`User email failed: ${userEmailResponse.error.message}`)
    }

    console.log('✅ User email sent successfully to:', userEmail)

    // Send email to admin
    const adminEmailResponse = await resend.emails.send({
      from: 'noreply@campusarena.co', // ✅ Changed to your domain!
      to: process.env.ADMIN_EMAIL || 'admin@campusarena.co',
      ...adminWaitlistEmail(userName, userEmail)
    })

    if (adminEmailResponse.error) {
      throw new Error(`Admin email failed: ${adminEmailResponse.error.message}`)
    }

    console.log('✅ Admin email sent successfully to:', process.env.ADMIN_EMAIL)
    
    return true
  } catch (error) {
    console.error('❌ Email sending error:', error)
    throw error
  }
}