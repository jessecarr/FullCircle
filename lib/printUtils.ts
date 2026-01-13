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

const formatPayment = (payment: string): string => {
  if (!payment) return 'Not specified'
  return payment.charAt(0).toUpperCase() + payment.slice(1).replace('_', ' ')
}

export function printSpecialOrder(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  const subtotal = productLines.reduce((acc, line) => acc + (line.total_price || 0), 0)
  const tax = subtotal * 0.0795
  const total = subtotal * 1.0795

  // Calculate scale factor - scale down based on item count to fit in half page
  const itemCount = productLines.length
  let scaleFactor = 1.0
  if (itemCount >= 4) scaleFactor = 0.93
  if (itemCount >= 5) scaleFactor = 0.90
  if (itemCount >= 6) scaleFactor = 0.87
  if (itemCount >= 7) scaleFactor = 0.84
  if (itemCount >= 8) scaleFactor = 0.80
  if (itemCount >= 10) scaleFactor = 0.78

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Special Order Form</title>
      <style>
        @page {
          size: letter portrait;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        html, body {
          height: 100%;
          width: 100%;
          font-family: 'Arial', sans-serif;
          color: #000;
          background: white;
        }
        
        .page-container {
          height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .print-copy {
          height: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0.15in 0.3in;
          overflow: hidden;
        }
        
        .print-copy:first-child {
          border-bottom: 1px dashed #999;
        }
        
        .form-content {
          width: 100%;
          max-width: 7.5in;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #000;
          padding: 15px 20px;
          transform: scale(${scaleFactor});
          transform-origin: top center;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        
        .print-date {
          text-align: left;
          font-size: 11px;
          margin-bottom: 8px;
        }
        
        .print-title {
          font-size: 22px;
          font-weight: bold;
        }
        
        .info-row {
          display: flex;
          gap: 20px;
          margin-bottom: 8px;
        }
        
        .info-column {
          flex: 1;
        }
        
        .print-section {
          margin-bottom: 12px;
        }
        
        .print-section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
        }
        
        .print-field {
          margin-bottom: 4px;
          display: flex;
        }
        
        .print-label {
          font-weight: bold;
          width: 90px;
          flex-shrink: 0;
          font-size: 13px;
        }
        
        .print-value {
          flex: 1;
          font-size: 13px;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          font-size: 12px;
        }
        
        .print-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .print-total-summary {
          margin-top: auto;
          padding: 8px 12px;
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
          padding-top: 2px;
          margin-bottom: 0;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
      <!-- Customer Copy (Top Half) -->
      <div class="print-copy">
        <div class="form-content">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Special Order Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
        </div>

        <div class="info-row">
          <div class="info-column">
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
          </div>
          <div class="info-column">
            <div class="print-section">
              <div class="print-section-title">Order Details</div>
              <div class="print-field">
                <div class="print-label">Delivery:</div>
                <div class="print-value">${data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer'}</div>
              </div>
              <div class="print-field">
                <div class="print-label">Payment:</div>
                <div class="print-value">${formatPayment(data.payment || '')}</div>
              </div>
            </div>
          </div>
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
      </div>

      <!-- Merchant Copy (Bottom Half) -->
      <div class="print-copy">
        <div class="form-content">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Special Order Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
        </div>

        <div class="info-row">
          <div class="info-column">
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
          </div>
          <div class="info-column">
            <div class="print-section">
              <div class="print-section-title">Order Details</div>
              <div class="print-field">
                <div class="print-label">Delivery:</div>
                <div class="print-value">${data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer'}</div>
              </div>
              <div class="print-field">
                <div class="print-label">Payment:</div>
                <div class="print-value">${formatPayment(data.payment || '')}</div>
              </div>
            </div>
          </div>
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
      </div>
      </div>
    </body>
    </html>
  `

  executePrint(printContent)
}

export function printInboundTransfer(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  const subtotal = productLines.reduce((acc, line) => acc + (line.unit_price || 0), 0)
  const tax = 0
  const total = subtotal

  // Calculate scale factor - scale down based on item count to fit in half page
  const itemCount = productLines.length
  let scaleFactor = 1.0
  if (itemCount >= 4) scaleFactor = 0.93
  if (itemCount >= 5) scaleFactor = 0.90
  if (itemCount >= 6) scaleFactor = 0.87
  if (itemCount >= 7) scaleFactor = 0.84
  if (itemCount >= 8) scaleFactor = 0.80
  if (itemCount >= 10) scaleFactor = 0.78

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inbound Transfer Form</title>
      <style>
        @page {
          size: letter portrait;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        html, body {
          height: 100%;
          width: 100%;
          font-family: 'Arial', sans-serif;
          color: #000;
          background: white;
        }
        
        .page-container {
          height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .print-copy {
          height: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0.15in 0.3in;
          overflow: hidden;
        }
        
        .print-copy:first-child {
          border-bottom: 1px dashed #999;
        }
        
        .form-content {
          width: 100%;
          max-width: 7.5in;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #000;
          padding: 15px 20px;
          transform: scale(${scaleFactor});
          transform-origin: top center;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        
        .print-date {
          text-align: left;
          font-size: 11px;
          margin-bottom: 8px;
        }
        
        .print-title {
          font-size: 22px;
          font-weight: bold;
        }
        
        .print-section {
          margin-bottom: 12px;
        }
        
        .print-section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
        }
        
        .print-field {
          margin-bottom: 4px;
          display: flex;
        }
        
        .print-label {
          font-weight: bold;
          width: 90px;
          flex-shrink: 0;
          font-size: 13px;
        }
        
        .print-value {
          flex: 1;
          font-size: 13px;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          font-size: 12px;
        }
        
        .print-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .print-total-summary {
          margin-top: auto;
          padding: 8px 12px;
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
          padding-top: 2px;
          margin-bottom: 0;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
      <!-- Customer Copy (Top Half) -->
      <div class="print-copy">
        <div class="form-content">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Inbound Transfer Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
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
          ${data.drivers_license ? `
            <div class="print-field">
              <div class="print-label">License:</div>
              <div class="print-value">${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</div>
            </div>
          ` : ''}
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
                <th style="width: 15%">Control #</th>
                <th style="width: 25%">Manufacturer</th>
                <th style="width: 15%">Model</th>
                <th style="width: 15%">Serial #</th>
                <th style="width: 15%">Order Type</th>
                <th style="width: 15%">Unit Price</th>
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
          
          <div class="print-total-summary">
            <div class="print-total-row">
              <span style="font-weight: bold">Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="print-total-row">
              <span style="font-weight: bold">Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="print-total-row final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Merchant Copy (Bottom Half) -->
      <div class="print-copy">
        <div class="form-content">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Inbound Transfer Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
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
          ${data.drivers_license ? `
            <div class="print-field">
              <div class="print-label">License:</div>
              <div class="print-value">${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</div>
            </div>
          ` : ''}
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
                <th style="width: 15%">Control #</th>
                <th style="width: 25%">Manufacturer</th>
                <th style="width: 15%">Model</th>
                <th style="width: 15%">Serial #</th>
                <th style="width: 15%">Order Type</th>
                <th style="width: 15%">Unit Price</th>
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
          
          <div class="print-total-summary">
            <div class="print-total-row">
              <span style="font-weight: bold">Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="print-total-row">
              <span style="font-weight: bold">Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="print-total-row final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </body>
    </html>
  `

  executePrint(printContent)
}

export function printSuppressorApproval(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  const subtotal = productLines.reduce((acc, line) => acc + (line.unit_price || 0), 0)
  const tax = 0
  const total = subtotal

  // Calculate scale factor - scale down based on item count to fit in half page
  const itemCount = productLines.length
  let scaleFactor = 1.0
  if (itemCount >= 4) scaleFactor = 0.93
  if (itemCount >= 5) scaleFactor = 0.90
  if (itemCount >= 6) scaleFactor = 0.87
  if (itemCount >= 7) scaleFactor = 0.84
  if (itemCount >= 8) scaleFactor = 0.80
  if (itemCount >= 10) scaleFactor = 0.78

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Suppressor Approval Form</title>
      <style>
        @page {
          size: letter portrait;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        html, body {
          height: 100%;
          width: 100%;
          font-family: 'Arial', sans-serif;
          color: #000;
          background: white;
        }
        
        .page-container {
          height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .print-copy {
          height: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0.15in 0.3in;
          overflow: hidden;
        }
        
        .print-copy:first-child {
          border-bottom: 1px dashed #999;
        }
        
        .form-content {
          width: 100%;
          max-width: 7.5in;
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #000;
          padding: 15px 20px;
          transform: scale(${scaleFactor});
          transform-origin: top center;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        
        .print-date {
          text-align: left;
          font-size: 11px;
          margin-bottom: 8px;
        }
        
        .print-title {
          font-size: 22px;
          font-weight: bold;
        }
        
        .print-section {
          margin-bottom: 12px;
        }
        
        .print-section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 6px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
        }
        
        .print-field {
          margin-bottom: 4px;
          display: flex;
        }
        
        .print-label {
          font-weight: bold;
          width: 90px;
          flex-shrink: 0;
          font-size: 13px;
        }
        
        .print-value {
          flex: 1;
          font-size: 13px;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          text-align: left;
          font-size: 12px;
        }
        
        .print-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .print-total-summary {
          margin-top: auto;
          padding: 8px 12px;
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
          padding-top: 2px;
          margin-bottom: 0;
        }
      </style>
    </head>
    <body>
      <div class="page-container">
      <!-- Customer Copy (Top Half) -->
      <div class="print-copy">
        <div class="form-content">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Suppressor Approval Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
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
          ${data.drivers_license ? `
            <div class="print-field">
              <div class="print-label">License:</div>
              <div class="print-value">${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</div>
            </div>
          ` : ''}
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
                <th style="width: 15%">Control #</th>
                <th style="width: 25%">Manufacturer</th>
                <th style="width: 15%">Model</th>
                <th style="width: 15%">Serial #</th>
                <th style="width: 15%">Order Type</th>
                <th style="width: 15%">Unit Price</th>
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
          
          <div class="print-total-summary">
            <div class="print-total-row">
              <span style="font-weight: bold">Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="print-total-row">
              <span style="font-weight: bold">Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="print-total-row final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- Merchant Copy (Bottom Half) -->
      <div class="print-copy">
        <div class="form-content">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div class="print-header">
          <div class="print-title">Suppressor Approval Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
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
          ${data.drivers_license ? `
            <div class="print-field">
              <div class="print-label">License:</div>
              <div class="print-value">${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</div>
            </div>
          ` : ''}
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
                <th style="width: 15%">Control #</th>
                <th style="width: 25%">Manufacturer</th>
                <th style="width: 15%">Model</th>
                <th style="width: 15%">Serial #</th>
                <th style="width: 15%">Order Type</th>
                <th style="width: 15%">Unit Price</th>
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
          
          <div class="print-total-summary">
            <div class="print-total-row">
              <span style="font-weight: bold">Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="print-total-row">
              <span style="font-weight: bold">Tax:</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="print-total-row final">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
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
        @page {
          size: portrait;
          margin: 0.4in;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          color: #000;
          background: white;
          padding: 15px;
          max-width: 8in;
          margin: 0 auto;
          font-size: 12px;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .print-date {
          text-align: left;
          font-size: 10px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .print-title {
          font-size: 22px;
          font-weight: bold;
        }
        
        .section-box {
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-decoration: underline;
          margin-bottom: 12px;
        }
        
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .field-group {
          margin-bottom: 10px;
        }
        
        .field-label {
          font-size: 11px;
          font-weight: bold;
          color: #333;
          margin-bottom: 3px;
        }
        
        .field-value {
          font-size: 12px;
          padding: 6px 8px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-height: 28px;
        }
        
        .field-value.address {
          min-height: 60px;
          white-space: pre-wrap;
        }
        
        .address-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .address-right {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        .items-table th,
        .items-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
          font-size: 11px;
        }
        
        .items-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div class="print-date">
          ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
        <div class="print-title">Outbound Transfer Form</div>
        ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
      </div>

      <!-- Transferor Section -->
      <div class="section-box">
        <div class="section-title">Transferor</div>
        <div class="two-column">
          <div class="field-group">
            <div class="field-label">Name</div>
            <div class="field-value">${data.customer_name || ''}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Phone</div>
            <div class="field-value">${formatPhoneNumber(data.customer_phone || '')}</div>
          </div>
          ${data.drivers_license ? `
          <div class="field-group">
            <div class="field-label">Driver's License</div>
            <div class="field-value">${data.drivers_license}</div>
          </div>
          ` : ''}
          ${data.license_expiration ? `
          <div class="field-group">
            <div class="field-label">License Expiration</div>
            <div class="field-value">${data.license_expiration}</div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Transferee Section -->
      <div class="section-box">
        <div class="section-title">Transferee</div>
        <div class="two-column">
          <div class="field-group">
            <div class="field-label">Transferee Name</div>
            <div class="field-value">${data.transferee_name || ''}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Transferee Phone</div>
            <div class="field-value">${formatPhoneNumber(data.transferee_phone || '')}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Transferee FFL Name</div>
            <div class="field-value">${data.transferee_ffl_name || ''}</div>
          </div>
          <div class="field-group">
            <div class="field-label">Transferee FFL Phone</div>
            <div class="field-value">${formatPhoneNumber(data.transferee_ffl_phone || '')}</div>
          </div>
        </div>
        <div class="address-grid" style="margin-top: 15px;">
          <div class="field-group">
            <div class="field-label">Street Address</div>
            <div class="field-value address">${data.transferee_ffl_address || ''}</div>
          </div>
          <div class="address-right">
            <div class="field-group">
              <div class="field-label">Zip</div>
              <div class="field-value">${data.transferee_ffl_zip || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">State</div>
              <div class="field-value">${data.transferee_ffl_state || ''}</div>
            </div>
            <div class="field-group">
              <div class="field-label">City</div>
              <div class="field-value">${data.transferee_ffl_city || ''}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transfer Items Section -->
      <div class="section-box">
        <div class="section-title">Transfer Items</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 20%">Control #</th>
              <th style="width: 25%">Manufacturer</th>
              <th style="width: 25%">Model</th>
              <th style="width: 30%">Serial #</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map((line) => `
              <tr>
                <td>${line.control_number || '-'}</td>
                <td>${line.manufacturer || '-'}</td>
                <td>${line.model || '-'}</td>
                <td>${line.serial_number || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${data.disposition_date ? `
      <div class="section-box">
        <div class="section-title">Disposition</div>
        <div class="field-group">
          <div class="field-label">Disposition Date</div>
          <div class="field-value">${new Date(data.disposition_date).toLocaleDateString()}</div>
        </div>
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

export function printConsignment(data: any) {
  const productLines = data.product_lines || []
  const totalAfterFee = productLines.reduce((acc: number, line: any) => acc + (line.after_fee || 0), 0)

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  const licenseHtml = data.drivers_license ? `
    <div class="print-field">
      <div class="print-label">License:</div>
      <div class="print-value">${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</div>
    </div>
  ` : ''

  const addressHtml = data.customer_street ? `
    <div class="print-field">
      <div class="print-label">Address:</div>
      <div class="print-value">
        ${data.customer_street}
        ${data.customer_city ? `, ${data.customer_city}` : ''}
        ${data.customer_state ? ` ${data.customer_state}` : ''}
        ${data.customer_zip ? ` ${data.customer_zip}` : ''}
      </div>
    </div>
  ` : ''

  const itemsHtml = productLines.map((line: any) => `
    <tr>
      <td>${line.control_number || '-'}</td>
      <td>${line.manufacturer || '-'}</td>
      <td>${line.model || '-'}</td>
      <td>${line.serial_number || '-'}</td>
      <td>${line.type || '-'}</td>
      <td>${line.caliber || '-'}</td>
      <td>${line.method || '-'}</td>
      <td>$${(line.sale_price || 0).toFixed(2)}</td>
      <td>$${(line.after_fee || 0).toFixed(2)}</td>
      <td>${line.check_number || '-'}</td>
    </tr>
  `).join('')

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Consignment Form</title>
      <style>
        @page { size: landscape; margin: 0.3in; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; width: 100%; font-family: 'Arial', sans-serif; color: #000; background: white; }
        .page-container { width: 100%; padding: 15px; }
        .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 15px; }
        .print-date { text-align: left; font-size: 11px; margin-bottom: 8px; }
        .print-title { font-size: 22px; font-weight: bold; }
        .print-section { margin-bottom: 15px; }
        .print-section-title { font-size: 14px; font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
        .print-field { margin-bottom: 4px; display: flex; }
        .print-label { font-weight: bold; width: 90px; flex-shrink: 0; font-size: 12px; }
        .print-value { flex: 1; font-size: 12px; }
        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 10px; }
        .print-table th { background-color: #f5f5f5; font-weight: bold; }
        .print-total-summary { margin-top: 15px; padding: 8px 12px; background-color: #f5f5f5; border: 1px solid #000; width: 300px; margin-left: auto; }
        .print-total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
        .print-total-row.final { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 2px; margin-bottom: 0; }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="print-date">${dateStr}</div>
        <div class="print-header">
          <div class="print-title">Consignment Form</div>
          ${data.order_number ? `<div style="font-size: 14px; font-weight: bold; margin-top: 4px;">Order #: ${data.order_number}</div>` : ''}
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
          ${licenseHtml}
          ${addressHtml}
        </div>
        <div class="print-section">
          <div class="print-section-title">Consignment Items</div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Control #</th>
                <th>Manufacturer</th>
                <th>Model</th>
                <th>Serial #</th>
                <th>Type</th>
                <th>Caliber</th>
                <th>Method</th>
                <th>Sale Price</th>
                <th>After Fee</th>
                <th>Check #</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="print-total-summary">
            <div class="print-total-row final">
              <span>Total After Fees:</span>
              <span>$${totalAfterFee.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  executePrint(printContent)
}

function downloadConsignmentPDF(data: any) {
  const productLines = data.product_lines || []
  const totalAfterFee = productLines.reduce((acc: number, line: any) => acc + (line.after_fee || 0), 0)
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  const addressHtml = data.customer_street 
    ? `<p><strong>Address:</strong> ${data.customer_street}${data.customer_city ? `, ${data.customer_city}` : ''}${data.customer_state ? ` ${data.customer_state}` : ''}${data.customer_zip ? ` ${data.customer_zip}` : ''}</p>` 
    : ''
  
  const statusHtml = data.status 
    ? `<p><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` 
    : ''

  const itemsHtml = productLines.map((line: any) => `
    <tr>
      <td style="border: 1px solid #000; padding: 6px;">${line.control_number || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.manufacturer || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.model || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.serial_number || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.type || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.caliber || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.method || '-'}</td>
      <td style="border: 1px solid #000; padding: 6px;">$${(line.sale_price || 0).toFixed(2)}</td>
      <td style="border: 1px solid #000; padding: 6px;">$${(line.after_fee || 0).toFixed(2)}</td>
      <td style="border: 1px solid #000; padding: 6px;">${line.check_number || '-'}</td>
    </tr>
  `).join('')

  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="font-size: 10px; text-align: left; color: #666;">${dateStr}</div>
        <h1 style="margin: 0; font-size: 24px;">Consignment Form</h1>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Customer Information</h3>
        <p><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        ${addressHtml}
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Consignment Items</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 6px;">Control #</th>
              <th style="border: 1px solid #000; padding: 6px;">Manufacturer</th>
              <th style="border: 1px solid #000; padding: 6px;">Model</th>
              <th style="border: 1px solid #000; padding: 6px;">Serial #</th>
              <th style="border: 1px solid #000; padding: 6px;">Type</th>
              <th style="border: 1px solid #000; padding: 6px;">Caliber</th>
              <th style="border: 1px solid #000; padding: 6px;">Method</th>
              <th style="border: 1px solid #000; padding: 6px;">Sale Price</th>
              <th style="border: 1px solid #000; padding: 6px;">After Fee</th>
              <th style="border: 1px solid #000; padding: 6px;">Check #</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-top: 10px;">
          <strong>Total After Fees: $${totalAfterFee.toFixed(2)}</strong>
        </div>
      </div>
      ${statusHtml}
    </div>
  `

  const filename = `Consignment_${data.customer_name || 'Form'}_${new Date().toISOString().split('T')[0]}.pdf`
  generateImage(content, filename)
}

export function printForm(data: any, formType: string) {
  // Parse product_lines if it's a string
  let productLines = data.product_lines
  if (typeof productLines === 'string') {
    try {
      productLines = JSON.parse(productLines)
    } catch (e) {
      console.error('Failed to parse product_lines:', e)
      productLines = []
    }
  }
  if (!Array.isArray(productLines)) {
    productLines = []
  }
  
  const processedData = { ...data, product_lines: productLines }
  
  switch (formType) {
    case 'special_orders':
      printSpecialOrder(processedData)
      break
    case 'inbound_transfers':
      printInboundTransfer(processedData)
      break
    case 'suppressor_approvals':
      printSuppressorApproval(processedData)
      break
    case 'outbound_transfers':
      printOutboundTransfer(processedData)
      break
    case 'consignment_forms':
      printConsignment(processedData)
      break
    default:
      console.error('Unknown form type:', formType)
  }
}

export function downloadFormPDF(data: any, formType: string) {
  // Debug: Log incoming data
  console.log('downloadFormPDF called with:', { formType, data })
  console.log('product_lines type:', typeof data.product_lines)
  console.log('product_lines value:', data.product_lines)
  
  // Parse product_lines if it's a string
  let productLines = data.product_lines
  if (typeof productLines === 'string') {
    try {
      productLines = JSON.parse(productLines)
    } catch (e) {
      console.error('Failed to parse product_lines:', e)
      productLines = []
    }
  }
  if (!Array.isArray(productLines)) {
    productLines = []
  }
  
  console.log('Processed product_lines:', productLines)
  
  const processedData = { ...data, product_lines: productLines }
  
  switch (formType) {
    case 'special_orders':
      downloadSpecialOrderPDF(processedData)
      break
    case 'inbound_transfers':
      downloadInboundTransferPDF(processedData)
      break
    case 'suppressor_approvals':
      downloadSuppressorApprovalPDF(processedData)
      break
    case 'outbound_transfers':
      downloadOutboundTransferPDF(processedData)
      break
    case 'consignment_forms':
      downloadConsignmentPDF(processedData)
      break
    default:
      console.error('Unknown form type:', formType)
  }
}

function downloadSpecialOrderPDF(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  const subtotal = productLines.reduce((acc, line) => acc + (line.total_price || 0), 0)
  const tax = subtotal * 0.0795
  const total = subtotal * 1.0795

  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Special Order Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        <p style="color: #000;"><strong>Email:</strong> ${data.customer_email || ''}</p>
        ${data.customer_street ? `<p style="color: #000;"><strong>Address:</strong> ${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</p>` : ''}
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: left; color: #fff;">SKU</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: left; color: #fff;">Description</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: left; color: #fff;">Vendor</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: center; color: #fff;">Qty</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: right; color: #fff;">Unit Price</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: right; color: #fff;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.sku || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.description || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.vendor || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: center; color: #000;">${line.quantity || 0}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: right; color: #000;">$${(line.unit_price || 0).toFixed(2)}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: right; color: #000;">$${((line.unit_price || 0) * (line.quantity || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 15px; padding: 10px; background-color: rgba(30, 64, 175, 0.1); border: 1px solid #1e40af; border-radius: 4px;">
          <p style="margin: 5px 0; color: #000;"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
          <p style="margin: 5px 0; color: #000;"><strong>Tax (7.95%):</strong> $${tax.toFixed(2)}</p>
          <p style="margin: 5px 0; font-size: 18px; border-top: 1px solid #1e40af; padding-top: 5px; color: #1e40af;"><strong>Total:</strong> $${total.toFixed(2)}</p>
        </div>
      </div>

      ${data.delivery_method ? `<p style="color: #000;"><strong>Delivery Method:</strong> ${data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer'}</p>` : ''}
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
      ${data.special_requests ? `<div style="margin-top: 20px;"><h3 style="color: #1e40af;">Special Requests</h3><p style="color: #000;">${data.special_requests}</p></div>` : ''}
    </div>
  `

  generateImage(content, `Special_Order_${data.customer_name || 'Form'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

function downloadInboundTransferPDF(data: any) {
  console.log('downloadInboundTransferPDF data:', JSON.stringify(data, null, 2))
  const productLines: ProductLine[] = data.product_lines || []
  console.log('productLines length:', productLines.length)
  
  // Build product rows HTML
  let productRowsHtml = ''
  for (let i = 0; i < productLines.length; i++) {
    const line = productLines[i]
    productRowsHtml += `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.control_number || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.order_type || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; color: #000;">$${(line.unit_price || 0).toFixed(2)}</td>
      </tr>
    `
  }
  
  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Inbound Transfer Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Transferor Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        ${data.customer_street ? `<p style="color: #000;"><strong>Address:</strong> ${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</p>` : ''}
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Control #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Type</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${productRowsHtml}
          </tbody>
        </table>
      </div>

      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
      ${data.special_requests ? `<div style="margin-top: 20px;"><h3 style="color: #1e40af;">Special Requests</h3><p style="color: #000;">${data.special_requests}</p></div>` : ''}
    </div>
  `
  
  console.log('Generated HTML content:', content.substring(0, 1000))

  generateImage(content, `Inbound_Transfer_${data.customer_name || 'Form'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

function downloadSuppressorApprovalPDF(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  
  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Suppressor Approval Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        ${data.customer_street ? `<p style="color: #000;"><strong>Address:</strong> ${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</p>` : ''}
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Control #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Type</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.control_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.order_type || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">$${(line.unit_price || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
      ${data.special_requests ? `<div style="margin-top: 20px;"><h3 style="color: #1e40af;">Special Requests</h3><p style="color: #000;">${data.special_requests}</p></div>` : ''}
    </div>
  `

  generateImage(content, `Suppressor_Approval_${data.customer_name || 'Form'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

function downloadOutboundTransferPDF(data: any) {
  const productLines: ProductLine[] = data.product_lines || []
  
  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Outbound Transfer Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Transferor Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Transferee Information</h3>
        ${data.transferee_name ? `<p style="color: #000;"><strong>Name:</strong> ${data.transferee_name}</p>` : ''}
        ${data.transferee_phone ? `<p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.transferee_phone)}</p>` : ''}
        ${data.transferee_ffl_name ? `<p style="color: #000;"><strong>FFL Name:</strong> ${data.transferee_ffl_name}</p>` : ''}
        ${data.transferee_ffl_phone ? `<p style="color: #000;"><strong>FFL Phone:</strong> ${formatPhoneNumber(data.transferee_ffl_phone)}</p>` : ''}
        ${data.transferee_ffl_address ? `<p style="color: #000;"><strong>FFL Address:</strong> ${data.transferee_ffl_address}</p>` : ''}
        ${data.transferee_ffl_city ? `<p style="color: #000;"><strong>FFL City:</strong> ${data.transferee_ffl_city}</p>` : ''}
        ${data.transferee_ffl_state ? `<p style="color: #000;"><strong>FFL State:</strong> ${data.transferee_ffl_state}</p>` : ''}
        ${data.transferee_ffl_zip ? `<p style="color: #000;"><strong>FFL Zip:</strong> ${data.transferee_ffl_zip}</p>` : ''}
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Control #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Type</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.control_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.order_type || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">$${(line.unit_price || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${data.disposition_date ? `<p style="color: #000;"><strong>Disposition Date:</strong> ${new Date(data.disposition_date).toLocaleDateString()}</p>` : ''}
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
    </div>
  `

  generateImage(content, `Outbound_Transfer_${data.customer_name || 'Form'}_${new Date().toISOString().split('T')[0]}.pdf`)
}

async function generateImage(htmlContent: string, filename: string) {
  console.log('generateImage called with content length:', htmlContent.length)
  
  // Create container with explicit styling
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.backgroundColor = '#ffffff'
  container.style.padding = '40px'
  container.style.fontFamily = 'Arial, sans-serif'
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 100))

  try {
    // Dynamic import html2canvas
    const html2canvas = (await import('html2canvas')).default
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false
    })
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename.replace('.pdf', '.jpg')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, 'image/jpeg', 0.95)
  } finally {
    document.body.removeChild(container)
  }
}

export async function generateFormImageBase64(data: any, formType: string): Promise<string> {
  console.log('generateFormImageBase64 called with:', { formType, data })
  const content = getFormHTMLContent(data, formType)
  console.log('Generated HTML content length:', content.length)
  
  // Create container with explicit styling
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.backgroundColor = '#ffffff'
  container.style.padding = '40px'
  container.style.fontFamily = 'Arial, sans-serif'
  container.innerHTML = content
  document.body.appendChild(container)

  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 100))

  try {
    const html2canvas = (await import('html2canvas')).default
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false
    })
    
    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
    return base64
  } finally {
    document.body.removeChild(container)
  }
}

function parseProductLines(data: any): any[] {
  let productLines = data.product_lines
  
  // If product_lines is a string, try to parse it as JSON
  if (typeof productLines === 'string') {
    try {
      productLines = JSON.parse(productLines)
    } catch (e) {
      console.error('Failed to parse product_lines:', e)
      productLines = []
    }
  }
  
  // Ensure it's an array
  if (!Array.isArray(productLines)) {
    productLines = []
  }
  
  return productLines
}

function getFormHTMLContent(data: any, formType: string): string {
  // Parse product_lines before passing to content generators
  const processedData = { ...data, product_lines: parseProductLines(data) }
  
  switch (formType) {
    case 'special_orders':
      return getSpecialOrderContent(processedData)
    case 'inbound_transfers':
      return getInboundTransferContent(processedData)
    case 'suppressor_approvals':
      return getSuppressorApprovalContent(processedData)
    case 'outbound_transfers':
      return getOutboundTransferContent(processedData)
    case 'consignment_forms':
      return getConsignmentContent(processedData)
    default:
      return '<div>Unknown form type</div>'
  }
}

function getSpecialOrderContent(data: any): string {
  const productLines: ProductLine[] = data.product_lines || []
  const subtotal = productLines.reduce((acc, line) => acc + (line.total_price || 0), 0)
  const tax = subtotal * 0.0795
  const total = subtotal * 1.0795

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Special Order Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        <p style="color: #000;"><strong>Email:</strong> ${data.customer_email || ''}</p>
        ${data.customer_street ? `<p style="color: #000;"><strong>Address:</strong> ${data.customer_street}, ${data.customer_city || ''} ${data.customer_state || ''} ${data.customer_zip || ''}</p>` : ''}
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: left; color: #fff;">SKU</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: left; color: #fff;">Description</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: left; color: #fff;">Vendor</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: center; color: #fff;">Qty</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: right; color: #fff;">Unit Price</th>
              <th style="border: 1px solid #1e40af; padding: 8px; text-align: right; color: #fff;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.sku || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.description || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.vendor || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: center; color: #000;">${line.quantity || 0}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: right; color: #000;">$${(line.unit_price || 0).toFixed(2)}</td>
                <td style="border: 1px solid #ccc; padding: 8px; text-align: right; color: #000;">$${((line.unit_price || 0) * (line.quantity || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 15px; padding: 10px; background-color: rgba(30, 64, 175, 0.1); border: 1px solid #1e40af; border-radius: 4px;">
          <p style="margin: 5px 0; color: #000;"><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
          <p style="margin: 5px 0; color: #000;"><strong>Tax (7.95%):</strong> $${tax.toFixed(2)}</p>
          <p style="margin: 5px 0; font-size: 18px; border-top: 1px solid #1e40af; padding-top: 5px; color: #1e40af;"><strong>Total:</strong> $${total.toFixed(2)}</p>
        </div>
      </div>
      ${data.delivery_method ? `<p style="color: #000;"><strong>Delivery Method:</strong> ${data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer'}</p>` : ''}
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
      ${data.special_requests ? `<div style="margin-top: 20px;"><h3 style="color: #1e40af;">Special Requests</h3><p style="color: #000;">${data.special_requests}</p></div>` : ''}
    </div>
  `
}

function getInboundTransferContent(data: any): string {
  const productLines: ProductLine[] = data.product_lines || []
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Inbound Transfer Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        <p style="color: #000;"><strong>Email:</strong> ${data.customer_email || ''}</p>
        ${data.drivers_license ? `<p style="color: #000;"><strong>Driver's License:</strong> ${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</p>` : ''}
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Type</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.order_type || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">$${(line.unit_price || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
    </div>
  `
}

function getSuppressorApprovalContent(data: any): string {
  const productLines: ProductLine[] = data.product_lines || []
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Suppressor Approval Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        <p style="color: #000;"><strong>Email:</strong> ${data.customer_email || ''}</p>
        ${data.drivers_license ? `<p style="color: #000;"><strong>Driver's License:</strong> ${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</p>` : ''}
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Control #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Caliber</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.control_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${(line as any).caliber || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
    </div>
  `
}

function getOutboundTransferContent(data: any): string {
  const productLines: ProductLine[] = data.product_lines || []
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Outbound Transfer Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        <p style="color: #000;"><strong>Email:</strong> ${data.customer_email || ''}</p>
        ${data.drivers_license ? `<p style="color: #000;"><strong>Driver's License:</strong> ${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</p>` : ''}
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Caliber</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${(line as any).caliber || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
    </div>
  `
}

function getConsignmentContent(data: any): string {
  const productLines: ProductLine[] = data.product_lines || []
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #000; background-color: #fff;">
      <div style="text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 15px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #1e40af;">Consignment Form</h1>
        <p style="margin: 5px 0 0 0; color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Customer Information</h3>
        <p style="color: #000;"><strong>Name:</strong> ${data.customer_name || ''}</p>
        <p style="color: #000;"><strong>Phone:</strong> ${formatPhoneNumber(data.customer_phone || '')}</p>
        <p style="color: #000;"><strong>Email:</strong> ${data.customer_email || ''}</p>
        ${data.drivers_license ? `<p style="color: #000;"><strong>Driver's License:</strong> ${data.drivers_license}${data.license_expiration ? ` (Exp: ${data.license_expiration})` : ''}</p>` : ''}
      </div>
      <div style="margin-bottom: 20px;">
        <h3 style="border-bottom: 1px solid #1e40af; padding-bottom: 5px; color: #1e40af;">Items</h3>
        <table style="width: 100%; border-collapse: collapse; color: #000;">
          <thead>
            <tr style="background-color: #1e40af;">
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Manufacturer</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Model</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Serial #</th>
              <th style="border: 1px solid #1e40af; padding: 8px; color: #fff;">Caliber</th>
            </tr>
          </thead>
          <tbody>
            ${productLines.map(line => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.manufacturer || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.model || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${line.serial_number || '-'}</td>
                <td style="border: 1px solid #ccc; padding: 8px; color: #000;">${(line as any).caliber || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${data.status ? `<p style="color: #000;"><strong>Status:</strong> ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>` : ''}
    </div>
  `
}
