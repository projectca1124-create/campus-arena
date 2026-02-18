import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { PrismaClient } from '@prisma/client'
import { userContactConfirmationEmail, adminContactNotificationEmail } from '@/lib/email/contact-templates'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Contact API called')

    const body = await request.json()
    const { name, email, message } = body

    console.log('📦 Received contact data:', { name, email })

    if (!name || !email || !message) {
      console.log('❌ Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedMessage = message.trim()

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (trimmedName.length > 255) {
      return NextResponse.json(
        { error: 'Name is too long' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      console.log('❌ Validation failed: Invalid email format')
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (trimmedMessage.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (trimmedMessage.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    console.log('💾 Saving contact message to database...')
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage
      }
    })

    console.log('✅ Message saved to database:', contactMessage.id)

    console.log('📧 Sending confirmation email to user...')
    const userEmailResponse = await resend.emails.send({
      from: 'noreply@campusarena.co',
      to: trimmedEmail,
      ...userContactConfirmationEmail(trimmedName)
    })

    if (userEmailResponse.error) {
      throw new Error(`User email failed: ${userEmailResponse.error.message}`)
    }

    console.log('✅ User confirmation email sent')

    console.log('📧 Sending notification email to admin...')
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@campusarena.co'
    const adminEmailResponse = await resend.emails.send({
      from: 'noreply@campusarena.co',
      to: adminEmail,
      ...adminContactNotificationEmail(trimmedName, trimmedEmail, trimmedMessage)
    })

    if (adminEmailResponse.error) {
      throw new Error(`Admin email failed: ${adminEmailResponse.error.message}`)
    }

    console.log('✅ Admin notification email sent to:', adminEmail)

    const successResponse = {
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.',
      messageId: contactMessage.id
    }

    console.log('✅ Contact API request completed successfully')
    return NextResponse.json(successResponse, { status: 200 })

  } catch (error) {
    console.error('❌ API Error:', error)

    let errorMessage = 'An error occurred while sending your message'
    
    if (error instanceof Error) {
      errorMessage = error.message
    }

    console.error('Error details:', {
      message: errorMessage,
      type: error?.constructor?.name
    })

    return NextResponse.json(
      { 
        error: errorMessage,
        success: false 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      status: 'Contact API is running',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}