import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { requireAuth } from '@/lib/supabase/api'

interface PendingOrderData {
  orderNumber: string
  formType: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  productLines?: any[]
  totalPrice?: number
  createdAt: string
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const orderData: PendingOrderData = await request.json()

    if (!orderData.orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 })
    }

    // Check for Gmail credentials
    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !gmailAppPassword) {
      console.error('Missing Gmail credentials')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    // Format form type for display
    const formTypeDisplay = orderData.formType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    // Build product list HTML
    let productListHtml = ''
    if (orderData.productLines && orderData.productLines.length > 0) {
      productListHtml = `
        <h3 style="margin-top: 20px;">Products:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Description</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">SKU</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Qty</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Price</th>
          </tr>
          ${orderData.productLines.map(line => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${line.description || 'N/A'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${line.sku || 'N/A'}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${line.quantity || 1}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">$${(line.price || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
      `
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Pending Order Reminder</h1>
        </div>
        
        <div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107;">
          <p style="margin: 0; color: #856404;">
            <strong>⚠️ Action Required:</strong> This order has been submitted with a "Pending" status.
            Please review and process this order.
          </p>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #1e40af; margin-top: 0;">Order Details</h2>
          
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0;"><strong>Order Number:</strong></td>
              <td style="padding: 5px 0;">${orderData.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Form Type:</strong></td>
              <td style="padding: 5px 0;">${formTypeDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Customer Name:</strong></td>
              <td style="padding: 5px 0;">${orderData.customerName || 'N/A'}</td>
            </tr>
            ${orderData.customerPhone ? `
            <tr>
              <td style="padding: 5px 0;"><strong>Phone:</strong></td>
              <td style="padding: 5px 0;">${orderData.customerPhone}</td>
            </tr>
            ` : ''}
            ${orderData.customerEmail ? `
            <tr>
              <td style="padding: 5px 0;"><strong>Email:</strong></td>
              <td style="padding: 5px 0;">${orderData.customerEmail}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 5px 0;"><strong>Created:</strong></td>
              <td style="padding: 5px 0;">${new Date(orderData.createdAt).toLocaleString('en-US', { 
                timeZone: 'America/Chicago',
                dateStyle: 'full',
                timeStyle: 'short'
              })}</td>
            </tr>
            ${orderData.totalPrice ? `
            <tr>
              <td style="padding: 5px 0;"><strong>Total:</strong></td>
              <td style="padding: 5px 0; font-size: 18px; color: #1e40af;"><strong>$${orderData.totalPrice.toFixed(2)}</strong></td>
            </tr>
            ` : ''}
          </table>
          
          ${productListHtml}
        </div>
        
        <div style="padding: 20px; background-color: #f3f4f6; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This is an automated notification from Full Circle Reloading.
          </p>
        </div>
      </div>
    `

    // Send email
    await transporter.sendMail({
      from: gmailUser,
      to: 'Sales@FullCircleReloading.com',
      subject: `Pending Order# ${orderData.orderNumber}`,
      html: emailHtml,
    })

    return NextResponse.json({ success: true, message: 'Notification sent' })
  } catch (error) {
    console.error('Error sending pending order notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
