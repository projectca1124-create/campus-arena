// app/api/waitlist/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { saveWaitlistUser } from '@/lib/db/waitlist'
import { sendWaitlistEmails } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Waitlist API called')

    // Get data from request body
    const body = await request.json()
    const { name, email } = body

    console.log('📦 Received data:', { name, email })

    // Validate required fields
    if (!name || !email) {
      console.log('❌ Validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Trim strings
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    // Validate name length
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      console.log('❌ Validation failed: Invalid email format')
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Save to database
    console.log('💾 Saving user to database...')
    const user = await saveWaitlistUser({ 
      name: trimmedName, 
      email: trimmedEmail 
    })

    // Send emails
    console.log('📧 Sending emails to user and admin...')
    await sendWaitlistEmails({
      userName: trimmedName,
      userEmail: trimmedEmail,
    })

    // Return success response
    const successResponse = {
      success: true,
      message: 'Successfully joined waitlist!',
      userId: user.id
    }

    console.log('✅ API request completed successfully')
    return NextResponse.json(successResponse, { status: 200 })

  } catch (error) {
    console.error('❌ API Error:', error)

    // Extract error message
    let errorMessage = 'An error occurred while joining the waitlist'
    
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

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    { 
      status: 'Waitlist API is running',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}