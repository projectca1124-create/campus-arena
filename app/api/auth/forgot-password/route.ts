// app/api/auth/forgot-password/route.ts

import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import { getResetPasswordEmailTemplate } from '@/lib/email/reset-password'
import crypto from 'crypto'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    const trimmedEmail = email.trim().toLowerCase()

    console.log('📧 Forgot password request for:', trimmedEmail)

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

    console.log('👤 User found:', user ? 'YES' : 'NO')

    // IMPORTANT: Always return success message (don't reveal if account exists)
    // But only send email if account exists
    if (!user) {
      console.log('⚠️ User does not exist, not sending email')
      return Response.json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link.',
      })
    }

    // Account EXISTS - Generate reset token and send email
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    console.log('🔑 Generated token:', token)
    console.log('⏱️ Expires at:', expiresAt.toISOString())

    // Delete old tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: trimmedEmail },
    })

    // Create new reset token
    const createdToken = await prisma.passwordResetToken.create({
      data: {
        email: trimmedEmail,
        token,
        expiresAt,
      },
    })

    console.log('✅ Token saved to database:', createdToken)

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${token}`

    console.log('🔗 Reset link:', resetLink)

    // Send email with reset link
    const emailTemplate = getResetPasswordEmailTemplate(trimmedEmail, resetLink)
    
    const emailResponse = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@campusarena.co',
      to: trimmedEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    })

    console.log('📨 Email sent:', emailResponse)

    return Response.json({
      success: true,
      message: 'If an account exists with this email, you will receive a reset link.',
    })
  } catch (error) {
    console.error('❌ Forgot password error:', error)
    return Response.json(
      { error: 'Failed to process reset request' },
      { status: 500 }
    )
  }
}