import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, htmlContent, imageBase64, imageFilename } = body

    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, htmlContent' },
        { status: 400 }
      )
    }

    // Check for Gmail credentials
    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !gmailAppPassword) {
      console.error('Missing Gmail credentials. GMAIL_USER:', !!gmailUser, 'GMAIL_APP_PASSWORD:', !!gmailAppPassword)
      return NextResponse.json(
        { success: false, error: 'Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.' },
        { status: 500 }
      )
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    // Prepare email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      html: htmlContent,
    }

    // Add image attachment if provided
    if (imageBase64 && imageFilename) {
      mailOptions.attachments = [
        {
          filename: imageFilename,
          content: imageBase64,
          encoding: 'base64',
          contentType: 'image/jpeg',
        },
      ]
    }

    // Send email
    await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
