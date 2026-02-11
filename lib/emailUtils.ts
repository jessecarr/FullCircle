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

    const formLabel = FORM_TYPE_LABELS[formType] || 'Form'
    let subject: string
    let htmlContent: string
    let imageBase64: string | undefined
    let imageFilename: string | undefined

    if (formType === 'suppressor_approvals') {
      // Use the custom Mailchimp-based suppressor approval template
      const { getSuppressorApprovalEmailHtml } = await import('@/lib/suppressorApprovalEmailTemplate')
      subject = 'SUPPRESSOR APPROVAL'
      htmlContent = getSuppressorApprovalEmailHtml()
    } else {
      // Generate image for attachment (non-suppressor forms)
      const { generateFormImageBase64 } = await import('@/lib/printUtils')
      imageBase64 = await generateFormImageBase64(formData, formType)
      imageFilename = `${formLabel.replace(/\s+/g, '_')}_${formData.id || 'form'}.jpg`
      
      subject = `Your ${formLabel} from Full Circle Reloading`
      htmlContent = `
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
    }

    const emailPayload: any = {
      to: customerEmail,
      subject,
      htmlContent,
    }

    if (imageBase64 && imageFilename) {
      emailPayload.imageBase64 = imageBase64
      emailPayload.imageFilename = imageFilename
    }

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
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
