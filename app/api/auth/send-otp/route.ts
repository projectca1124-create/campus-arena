import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email, authType } = await request.json()

    console.log(`📧 OTP request for ${authType}:`, email)

    // Validate email format
    // Validate email format
   const eduEmailRegex = /^[^\s@]+@([^\s@]+\.)*[^\s@]+\.edu$/
    if (!eduEmailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please use your university email (.edu)' },
        { status: 400 }
      )
    }

    // Validate email domain has MX records
    const dns = await import('dns')
    const { promisify } = await import('util')
    const resolveMx = promisify(dns.resolveMx)
    // Validate email domain has MX records
    const domain = email.split('@')[1]
    try {
      console.log('🔍 Checking MX records for domain:', domain)
      const mxRecords = await resolveMx(domain)
      if (!mxRecords || mxRecords.length === 0) {
        console.log('❌ No MX records found for:', domain)
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        )
      }
      console.log('✅ MX records found:', mxRecords.length)
    } catch {
      console.log('❌ MX lookup failed for:', domain)
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Generate OTP

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    console.log(`✅ Generated OTP: ${otp} for ${email}`)

    // Save OTP to database
    await prisma.oTPToken.upsert({
      where: { email },
      update: {
        code: otp,
        expiresAt,
      },
      create: {
        email,
        code: otp,
        expiresAt,
      },
    })

    console.log('💾 OTP saved to database')

    // Send OTP email
    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 20px; background: #f9fafb; border-radius: 8px; margin: 20px 0; }
            .otp-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #1e40af; }
            .otp-code { font-size: 48px; font-weight: bold; color: #1e40af; letter-spacing: 10px; font-family: monospace; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Campus Arena</h1>
            </div>
            
            <div class="content">
              <p>Hey there! 👋</p>
              
              <p>You're just one step away from joining Campus Arena! Enter this verification code to confirm your email:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 14px;">Valid for 10 minutes</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
              
              <p>See you on Campus Arena! 🚀</p>
            </div>
            
            <div class="footer">
              <p>© 2026 Campus Arena. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    await resend.emails.send({
      from: 'noreply@campusarena.co',
      to: email,
      subject: '🔐 Your Campus Arena Verification Code',
      html: emailContent,
    })

    console.log('✅ OTP email sent successfully')

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
    })
  } catch (error) {
    console.error('❌ OTP Error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}