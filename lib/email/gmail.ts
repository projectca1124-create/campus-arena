import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    const result = await transporter.sendMail({
      from: `Campus Arena <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })

    console.log('✅ Email sent:', result.messageId)
    return result
  } catch (error) {
    console.error('❌ Email error:', error)
    throw error
  }
}