// app/api/auth/forgot-password/route.ts

import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getResetPasswordEmailTemplate } from '@/lib/email/reset-password'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    const trimmedEmail = email.trim().toLowerCase()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.edu$/
    if (!emailRegex.test(trimmedEmail)) {
      return Response.json(
        { error: 'Please use a valid university email (.edu)' },
        { status: 400 }
      )
    }

    // CHECK IF ACCOUNT EXISTS
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    })

    // IMPORTANT: Always return success message (don't reveal if account exists)
    // But only send email if account exists
    if (!user) {
      // Account doesn't exist - return same success response without sending email
      return Response.json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link.',
      })
    }

    // Account EXISTS - Generate reset token and send email
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Delete old tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: trimmedEmail },
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        email: trimmedEmail,
        token,
        expiresAt,
      },
    })

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${token}`

    // Send email with reset link
    const emailTemplate = getResetPasswordEmailTemplate(trimmedEmail, resetLink)
    
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@campusarena.co',
      to: trimmedEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })

    // Return same success message (don't reveal if account exists)
    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive a reset link.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return Response.json(
      { error: 'Failed to process reset request' },
      { status: 500 }
    )
  }
}