import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { PrismaClient } from '@prisma/client'
import dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)
const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function buildEmailTemplate(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--
    Force light mode in ALL email clients that support it.
    Gmail app, Apple Mail, Outlook — this prevents dark mode inversion.
  -->
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    /* Force light mode — prevents email clients from inverting colors */
    :root { color-scheme: light !important; }

    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f3f4f6 !important;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    /* Override any dark mode media query the email client tries to apply */
    @media (prefers-color-scheme: dark) {
      body { background-color: #f3f4f6 !important; }
      .wrapper { background-color: #f3f4f6 !important; }
      .card { background-color: #ffffff !important; }
      .otp-box { background-color: #eef2ff !important; border-color: #4f46e5 !important; }
      .otp-code { color: #4f46e5 !important; }
      .body-text { color: #374151 !important; }
      .muted-text { color: #6b7280 !important; }
      .footer-text { color: #9ca3af !important; }
      .header-text { color: #ffffff !important; }
    }

    /* Outlook dark mode */
    [data-ogsc] body { background-color: #f3f4f6 !important; }
    [data-ogsc] .card { background-color: #ffffff !important; }
    [data-ogsc] .otp-code { color: #4f46e5 !important; }
    [data-ogsc] .body-text { color: #374151 !important; }
  </style>
</head>
<!--
  bgcolor on body and table cells is the most reliable fallback
  for email clients that ignore CSS entirely (older Outlook, etc.)
-->
<body bgcolor="#f3f4f6" style="margin:0;padding:0;background-color:#f3f4f6;">
  <table class="wrapper" role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f3f4f6"
    style="background-color:#f3f4f6;width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Card -->
        <table class="card" role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border-collapse:collapse;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="#4f46e5"
              style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 32px;border-radius:16px 16px 0 0;">
              <!-- Logo mark -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 auto 12px;">
                <tr>
                  <td align="center" bgcolor="#ffffff" width="52" height="52"
                    style="width:52px;height:52px;border-radius:12px;background-color:#ffffff;text-align:center;vertical-align:middle;">
                    <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:900;color:#4f46e5;line-height:52px;display:block;">CA</span>
                  </td>
                </tr>
              </table>
              <h1 class="header-text"
                style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Campus Arena
              </h1>
              <p class="header-text"
                style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#c7d2fe;font-weight:400;">
                Email Verification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:36px 32px 24px;">
              <p class="body-text"
                style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#111827;font-weight:600;">
                Hey there! 👋
              </p>
              <p class="body-text"
                style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#374151;line-height:1.6;">
                You're one step away from joining your campus community. Use the code below to verify your email address.
              </p>

              <!-- OTP Box -->
              <table class="otp-box" role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse:collapse;background-color:#eef2ff;border-radius:12px;border:2px solid #4f46e5;margin:0 0 24px;">
                <tr>
                  <td align="center" bgcolor="#eef2ff" style="background-color:#eef2ff;padding:28px 24px;border-radius:12px;">
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#6366f1;letter-spacing:0.1em;text-transform:uppercase;">
                      Your verification code
                    </p>
                    <!-- The OTP digits — inline everything for max compatibility -->
                    <p class="otp-code"
                      style="margin:0;font-family:'Courier New',Courier,monospace;font-size:44px;font-weight:900;color:#4f46e5;letter-spacing:12px;line-height:1.2;">
                      ${otp}
                    </p>
                    <p class="muted-text"
                      style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">
                      ⏱ Valid for 10 minutes
                    </p>
                  </td>
                </tr>
              </table>

              <p class="muted-text"
                style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Your account won't be affected.
              </p>
              <p class="body-text"
                style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#374151;">
                See you on Campus Arena! 🚀
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;padding:0 32px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#ffffff" align="center"
              style="background-color:#ffffff;padding:20px 32px 28px;border-radius:0 0 16px 16px;">
              <p class="footer-text"
                style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;line-height:1.6;">
                © 2026 Campus Arena · All rights reserved
              </p>
              <p class="footer-text"
                style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;">
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const { email, authType } = await request.json()

    console.log(`📧 OTP request for ${authType}:`, email)

    const eduEmailRegex = /^[^\s@]+@([^\s@]+\.)*[^\s@]+\.edu$/
    if (!eduEmailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please use your university email (.edu)' },
        { status: 400 }
      )
    }

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
    } catch (err) {
      console.log('⚠️ MX lookup failed (network issue), proceeding anyway:', domain, err)
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    console.log(`✅ Generated OTP: ${otp} for ${email}`)

    await prisma.oTPToken.upsert({
      where: { email },
      update: { code: otp, expiresAt },
      create: { email, code: otp, expiresAt },
    })

    console.log('💾 OTP saved to database')

    await resend.emails.send({
      from: 'noreply@campusarena.co',
      to: email,
      subject: '🔐 Your Campus Arena Verification Code',
      html: buildEmailTemplate(otp),
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