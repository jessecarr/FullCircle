'use client'

interface EmailFormData {
  customerEmail: string
  customerName: string
  formType: string
  formData: any
}

const FORM_TYPE_LABELS: Record<string, string> = {
  special_orders: 'Special Order',
  inbound_transfers: 'Inbound Transfer',
  suppressor_approvals: 'Suppressor Approval',
  outbound_transfers: 'Outbound Transfer',
  consignment_forms: 'Consignment',
}

export async function sendFormEmail(data: EmailFormData): Promise<{ success: boolean; message: string }> {
  try {
    const { customerEmail, customerName, formType, formData } = data
    
    if (!customerEmail) {
      return { success: false, message: 'No customer email provided' }
    }

    // Generate image for attachment
    const { generateFormImageBase64 } = await import('@/lib/printUtils')
    const imageBase64 = await generateFormImageBase64(formData, formType)
    
    const formLabel = FORM_TYPE_LABELS[formType] || 'Form'
    const subject = `Your ${formLabel} from Full Circle Reloading`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Full Circle Reloading</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName || 'Valued Customer'},</p>
            <p>Thank you for your business! Please find attached a copy of your ${formLabel.toLowerCase()}.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Best regards,<br>Full Circle Reloading</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: customerEmail,
        subject,
        htmlContent,
        imageBase64,
        imageFilename: `${formLabel.replace(/\s+/g, '_')}_${formData.id || 'form'}.jpg`,
      }),
    })

    const result = await response.json()
    
    if (result.success) {
      return { success: true, message: `Email sent successfully to ${customerEmail}` }
    } else {
      return { success: false, message: result.error || 'Failed to send email' }
    }
  } catch (error) {
    console.error('Error sending form email:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to send email' }
  }
}
