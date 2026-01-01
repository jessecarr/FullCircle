'use client'

interface ProductLine {
  sku?: string
  description?: string
  vendor?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  control_number?: string
  manufacturer?: string
  model?: string
  serial_number?: string
  order_type?: string
}

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 10) return phone
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`
}

export function printSpecialOrder(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  const subtotal = productLines.reduce((acc, line) => acc + (line.total_price || 0), 0)
  const tax = subtotal * 0.0795
  const total = subtotal * 1.0795

  const itemCount = productLines.length
  let scaleFactor = 1.0
  if (itemCount > 3) scaleFactor = 0.85
  if (itemCount > 5) scaleFactor = 0.75
  if (itemCount > 7) scaleFactor = 0.65

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Special Order Form</title>
      <style>
        @page {
          size: portrait;
          margin: 0.25in;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          color: #000;
          background: white;
          padding: 10px;
          max-width: 8in;
          margin: 0 auto;
          transform: scale(${scaleFactor});
          transform-origin: top center;
        }
        
        .print-copy {
          border: 1px solid #000;
          padding: 15px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .print-copy:last-child {
          margin-bottom: 0;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .print-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .print-section {
          margin-bottom: 20px;
        }
        
        .print-section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
        }
        
        .print-field {
          margin-bottom: 6px;
          display: flex;
        }
        
        .print-label {
          font-weight: bold;
          width: 120px;
          flex-shrink: 0;
          font-size: 12px;
        }
        
        .print-value {
          flex: 1;
          font-size: 12px;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
          font-size: 11px;
        }
        
        .print-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .print-total-summary {
          margin-top: 15px;
          padding: 8px;
          background-color: #f5f5f5;
          border: 1px solid #000;
        }
        
        .print-total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 12px;
        }
        
        .print-total-row.final {
          font-size: 14px;
          font-weight: bold;
          border-top: 1px solid #000;
          padding-top: 3px;
          margin-bottom: 0;
        }
      </style>
    </head>
    <body>
      <!-- Customer Copy -->
      <div class="print-copy">
        <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Special Order Form</div>
        </div>

        <div class="print-section">
          <div class="print-section-title">Customer Information</div>
          <div class="print-field">
            <div class="print-label">Name:</div>
            <div class="print-value">${data.customer_name || ''}</div>
          </div>
          <div class="print-field">
            <div class="print-label">Phone:</div>
            <div class="print-value">${formatPhoneNumber(data.customer_phone || '')}</div>
          </div>
          ${data.customer_street ? `
            <div class="print-field">
              <div class="print-label">Address:</div>
              <div class="print-value">
                ${data.customer_street}
                ${data.customer_city ? `, ${data.customer_city}` : ''}
                ${data.customer_state ? ` ${data.customer_state}` : ''}
                ${data.customer_zip ? ` ${data.customer_zip}` : ''}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="print-section">
          <div class="print-section-title">Order Items</div>
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 15%">SKU</th>
                <th style="width: 35%">Description</th>
                <th style="width: 15%">Vendor</th>
                <th style="width: 10%">Qty</th>
                <th style="width: 15%">Unit Price</th>
                <th style="width: 10%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${productLines.map((line) => `
                <tr>
                  <td>${line.sku || '-'}</td>
                  <td>${line.description || '-'}</td>
                  <td>${line.vendor || '-'}</td>
                  <td>${line.quantity || 0}</td>
                  <td>$${(line.unit_price || 0).toFixed(2)}</td>
                  <td>$${((line.unit_price || 0) * (line.quantity || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="print-total-summary">
            <div class="print-total-row">
              <span style="font-weight: bold">Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="print-total-row">
              <span style="font-weight: bold">Tax (7.95%):</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="print-total-row final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Merchant Copy -->
      <div class="print-copy">
        <div style="text-align: left; font-size: 10px; margin-bottom: 10px;">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Special Order Form</div>
        </div>

        <div class="print-section">
          <div class="print-section-title">Customer Information</div>
          <div class="print-field">
            <div class="print-label">Name:</div>
            <div class="print-value">${data.customer_name || ''}</div>
          </div>
          <div class="print-field">
            <div class="print-label">Phone:</div>
            <div class="print-value">${formatPhoneNumber(data.customer_phone || '')}</div>
          </div>
          ${data.customer_street ? `
            <div class="print-field">
              <div class="print-label">Address:</div>
              <div class="print-value">
                ${data.customer_street}
                ${data.customer_city ? `, ${data.customer_city}` : ''}
                ${data.customer_state ? ` ${data.customer_state}` : ''}
                ${data.customer_zip ? ` ${data.customer_zip}` : ''}
              </div>
            </div>
          ` : ''}
        </div>

        <div class="print-section">
          <div class="print-section-title">Order Items</div>
          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 15%">SKU</th>
                <th style="width: 35%">Description</th>
                <th style="width: 15%">Vendor</th>
                <th style="width: 10%">Qty</th>
                <th style="width: 15%">Unit Price</th>
                <th style="width: 10%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${productLines.map((line) => `
                <tr>
                  <td>${line.sku || '-'}</td>
                  <td>${line.description || '-'}</td>
                  <td>${line.vendor || '-'}</td>
                  <td>${line.quantity || 0}</td>
                  <td>$${(line.unit_price || 0).toFixed(2)}</td>
                  <td>$${((line.unit_price || 0) * (line.quantity || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="print-total-summary">
            <div class="print-total-row">
              <span style="font-weight: bold">Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="print-total-row">
              <span style="font-weight: bold">Tax (7.95%):</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="print-total-row final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  executePrint(printContent)
}

export function printInboundTransfer(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inbound Transfer Form</title>
      <style>
        @page { size: portrait; margin: 0.5in; }
        body { font-family: Arial, sans-serif; color: #000; background: white; padding: 20px; }
        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .print-title { font-size: 24px; font-weight: bold; }
        .print-section { margin-bottom: 20px; }
        .print-section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .print-field { margin-bottom: 8px; display: flex; }
        .print-label { font-weight: bold; width: 150px; }
        .print-value { flex: 1; }
        .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .print-table th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-title">Inbound Transfer Form</div>
        <div style="font-size: 12px; margin-top: 5px;">${new Date().toLocaleDateString()}</div>
      </div>

      <div class="print-section">
        <div class="print-section-title">Transferor Information</div>
        <div class="print-field"><div class="print-label">Name:</div><div class="print-value">${data.transferor_name || data.customer_name || ''}</div></div>
        <div class="print-field"><div class="print-label">Phone:</div><div class="print-value">${formatPhoneNumber(data.transferor_phone || data.customer_phone || '')}</div></div>
        ${data.customer_street ? `<div class="print-field"><div class="print-label">Address:</div><div class="print-value">${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</div></div>` : ''}
      </div>

      <div class="print-section">
        <div class="print-section-title">Items</div>
        <table class="print-table">
          <thead>
            <tr>
              <th>Control #</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Serial #</th>
              <th>Type</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map((line) => `
              <tr>
                <td>${line.control_number || '-'}</td>
                <td>${line.manufacturer || '-'}</td>
                <td>${line.model || '-'}</td>
                <td>${line.serial_number || '-'}</td>
                <td>${line.order_type || '-'}</td>
                <td>$${(line.unit_price || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${data.special_requests ? `
        <div class="print-section">
          <div class="print-section-title">Special Requests</div>
          <p>${data.special_requests}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `

  executePrint(printContent)
}

export function printSuppressorApproval(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Suppressor Approval Form</title>
      <style>
        @page { size: portrait; margin: 0.5in; }
        body { font-family: Arial, sans-serif; color: #000; background: white; padding: 20px; }
        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .print-title { font-size: 24px; font-weight: bold; }
        .print-section { margin-bottom: 20px; }
        .print-section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .print-field { margin-bottom: 8px; display: flex; }
        .print-label { font-weight: bold; width: 150px; }
        .print-value { flex: 1; }
        .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .print-table th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-title">Suppressor Approval Form</div>
        <div style="font-size: 12px; margin-top: 5px;">${new Date().toLocaleDateString()}</div>
      </div>

      <div class="print-section">
        <div class="print-section-title">Customer Information</div>
        <div class="print-field"><div class="print-label">Name:</div><div class="print-value">${data.customer_name || ''}</div></div>
        <div class="print-field"><div class="print-label">Phone:</div><div class="print-value">${formatPhoneNumber(data.customer_phone || '')}</div></div>
        ${data.customer_street ? `<div class="print-field"><div class="print-label">Address:</div><div class="print-value">${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</div></div>` : ''}
      </div>

      <div class="print-section">
        <div class="print-section-title">Items</div>
        <table class="print-table">
          <thead>
            <tr>
              <th>Control #</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Serial #</th>
              <th>Type</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map((line) => `
              <tr>
                <td>${line.control_number || '-'}</td>
                <td>${line.manufacturer || '-'}</td>
                <td>${line.model || '-'}</td>
                <td>${line.serial_number || '-'}</td>
                <td>${line.order_type || '-'}</td>
                <td>$${(line.unit_price || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${data.special_requests ? `
        <div class="print-section">
          <div class="print-section-title">Special Requests</div>
          <p>${data.special_requests}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `

  executePrint(printContent)
}

export function printOutboundTransfer(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Outbound Transfer Form</title>
      <style>
        @page { size: portrait; margin: 0.5in; }
        body { font-family: Arial, sans-serif; color: #000; background: white; padding: 20px; }
        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .print-title { font-size: 24px; font-weight: bold; }
        .print-section { margin-bottom: 20px; }
        .print-section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .print-field { margin-bottom: 8px; display: flex; }
        .print-label { font-weight: bold; width: 150px; }
        .print-value { flex: 1; }
        .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .print-table th { background-color: #f5f5f5; }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-title">Outbound Transfer Form</div>
        <div style="font-size: 12px; margin-top: 5px;">${new Date().toLocaleDateString()}</div>
      </div>

      <div class="print-section">
        <div class="print-section-title">Transferor Information</div>
        <div class="print-field"><div class="print-label">Name:</div><div class="print-value">${data.customer_name || ''}</div></div>
        <div class="print-field"><div class="print-label">Phone:</div><div class="print-value">${formatPhoneNumber(data.customer_phone || '')}</div></div>
        ${data.customer_street ? `<div class="print-field"><div class="print-label">Address:</div><div class="print-value">${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</div></div>` : ''}
      </div>

      ${data.transferee_name ? `
        <div class="print-section">
          <div class="print-section-title">Transferee Information</div>
          <div class="print-field"><div class="print-label">Name:</div><div class="print-value">${data.transferee_name}</div></div>
          ${data.transferee_phone ? `<div class="print-field"><div class="print-label">Phone:</div><div class="print-value">${formatPhoneNumber(data.transferee_phone)}</div></div>` : ''}
          ${data.transferee_ffl_name ? `<div class="print-field"><div class="print-label">FFL Name:</div><div class="print-value">${data.transferee_ffl_name}</div></div>` : ''}
          ${data.transferee_ffl_address ? `<div class="print-field"><div class="print-label">FFL Address:</div><div class="print-value">${data.transferee_ffl_address}, ${data.transferee_ffl_city || ''} ${data.transferee_ffl_state || ''} ${data.transferee_ffl_zip || ''}</div></div>` : ''}
        </div>
      ` : ''}

      <div class="print-section">
        <div class="print-section-title">Items</div>
        <table class="print-table">
          <thead>
            <tr>
              <th>Control #</th>
              <th>Manufacturer</th>
              <th>Model</th>
              <th>Serial #</th>
              <th>Type</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map((line) => `
              <tr>
                <td>${line.control_number || '-'}</td>
                <td>${line.manufacturer || '-'}</td>
                <td>${line.model || '-'}</td>
                <td>${line.serial_number || '-'}</td>
                <td>${line.order_type || '-'}</td>
                <td>$${(line.unit_price || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${data.disposition_date ? `
        <div class="print-section">
          <div class="print-section-title">Disposition Date</div>
          <p>${new Date(data.disposition_date).toLocaleDateString()}</p>
        </div>
      ` : ''}
    </body>
    </html>
  `

  executePrint(printContent)
}

function executePrint(printContent: string) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'absolute'
  iframe.style.left = '-9999px'
  iframe.style.top = '-9999px'
  iframe.style.width = '0px'
  iframe.style.height = '0px'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (iframeDoc) {
    iframeDoc.open()
    iframeDoc.write(printContent)
    iframeDoc.close()

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }, 500)
    }
  }
}

export function printForm(data: any, formType: string) {
  switch (formType) {
    case 'special_orders':
      printSpecialOrder(data)
      break
    case 'inbound_transfers':
      printInboundTransfer(data)
      break
    case 'suppressor_approvals':
      printSuppressorApproval(data)
      break
    case 'outbound_transfers':
      printOutboundTransfer(data)
      break
    default:
      console.error('Unknown form type:', formType)
  }
}
