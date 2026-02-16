// lib/email/send.ts

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
    console.log(`📧 Sending welcome email to ${userEmail}...`)
    const userEmailResponse = await resend.emails.send({
      from: 'Campus Arena <onboarding@resend.dev>',
      to: userEmail,
      ...userWaitlistEmail(userName)
    })

    if (userEmailResponse.error) {
      throw new Error(`User email failed: ${userEmailResponse.error.message}`)
    }

    console.log('✅ User email sent successfully:', userEmailResponse.id)

    // Send email to admin
    console.log(`📧 Sending admin notification to ${process.env.ADMIN_EMAIL}...`)
    const adminEmailResponse = await resend.emails.send({
      from: 'Campus Arena <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL || 'admin@campusarena.com',
      ...adminWaitlistEmail(userName, userEmail)
    })

    if (adminEmailResponse.error) {
      throw new Error(`Admin email failed: ${adminEmailResponse.error.message}`)
    }

    console.log('✅ Admin email sent successfully:', adminEmailResponse.id)
    console.log('✅ Both emails sent successfully!')
    
    return true
  } catch (error) {
    console.error('❌ Email sending error:', error)
    throw error
  }
}