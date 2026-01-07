'use client'

import React from 'react'
import { SpecialOrderForm } from '@/lib/supabase'

interface FormPrintViewProps {
  data: SpecialOrderForm
  onClose: () => void
}

export function FormPrintView({ data, onClose }: FormPrintViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 0.5in;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-area, .print-area * {
            visibility: visible;
          }
          
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        .print-area {
          font-family: 'Arial', sans-serif;
          color: #ffffff;
          background: 
            radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 0% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 100% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 30%),
            radial-gradient(circle at 85% 15%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 15% 15%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 85% 85%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            radial-gradient(circle at 15% 85%, rgba(96, 165, 250, 0.2) 0%, transparent 25%),
            rgba(17, 24, 39, 0.98);
          padding: 20px;
          max-width: 8in;
          margin: 0 auto;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 0.5rem;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .print-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .print-subtitle {
          font-size: 14px;
          color: #666;
        }
        
        .print-section {
          margin-bottom: 25px;
        }
        
        .print-section-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        
        .print-field {
          margin-bottom: 8px;
          display: flex;
        }
        
        .print-label {
          font-weight: bold;
          width: 150px;
          flex-shrink: 0;
        }
        
        .print-value {
          flex: 1;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        
        .print-table th {
          background-color: rgba(59, 130, 246, 0.2);
          font-weight: bold;
          color: #ffffff;
        }
        
        .print-total {
          text-align: right;
          font-size: 16px;
          font-weight: bold;
          margin-top: 10px;
        }
        
        .print-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 12px;
          color: #666;
        }
      `}</style>

      <div className="print-area">
        {/* Print Header */}
        <div className="print-header">
          <div className="print-title">Special Order Form</div>
          <div className="print-subtitle">
            Order ID: {data.id} | Date: {formatDate(data.created_at)}
          </div>
        </div>

        {/* Customer Information */}
        <div className="print-section">
          <div className="print-section-title">Customer Information</div>
          <div className="print-field">
            <div className="print-label">Name:</div>
            <div className="print-value">{data.customer_name}</div>
          </div>
          <div className="print-field">
            <div className="print-label">Email:</div>
            <div className="print-value">{data.customer_email}</div>
          </div>
          <div className="print-field">
            <div className="print-label">Phone:</div>
            <div className="print-value">{formatPhone(data.customer_phone)}</div>
          </div>
          {data.customer_street && (
            <div className="print-field">
              <div className="print-label">Address:</div>
              <div className="print-value">
                {data.customer_street}
                {data.customer_city && `, ${data.customer_city}`}
                {data.customer_state && ` ${data.customer_state}`}
                {data.customer_zip && ` ${data.customer_zip}`}
              </div>
            </div>
          )}
        </div>

        {/* Product Lines */}
        <div className="print-section">
          <div className="print-section-title">Order Items</div>
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>SKU</th>
                <th style={{ width: '35%' }}>Description</th>
                <th style={{ width: '20%' }}>Vendor</th>
                <th style={{ width: '10%' }}>Qty</th>
                <th style={{ width: '10%' }}>Unit Price</th>
                <th style={{ width: '10%' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.product_lines.map((line: any, index: number) => (
                <tr key={index}>
                  <td>{line.sku || '-'}</td>
                  <td>{line.description || '-'}</td>
                  <td>{line.vendor || '-'}</td>
                  <td>{line.quantity || 1}</td>
                  <td>{formatCurrency(line.unit_price || 0)}</td>
                  <td>{formatCurrency(line.total_price || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Order Total Summary */}
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
              <span style={{ fontWeight: 'bold' }}>Subtotal:</span>
              <span>{formatCurrency(data.product_lines.reduce((acc: number, line: any) => acc + (line.total_price || 0), 0))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' }}>
              <span style={{ fontWeight: 'bold' }}>Tax (7.95%):</span>
              <span>{formatCurrency(data.product_lines.reduce((acc: number, line: any) => acc + (line.total_price || 0), 0) * 0.0795)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '5px' }}>
              <span>Total:</span>
              <span>{formatCurrency(data.product_lines.reduce((acc: number, line: any) => acc + (line.total_price || 0), 0) * 1.0795)}</span>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="print-section">
          <div className="print-section-title">Order Details</div>
          <div className="print-field">
            <div className="print-label">Delivery Method:</div>
            <div className="print-value">
              {data.delivery_method === 'in_store_pickup' ? 'In-Store Pickup' : 'Ship to Customer'}
            </div>
          </div>
          <div className="print-field">
            <div className="print-label">Status:</div>
            <div className="print-value">{data.status.charAt(0).toUpperCase() + data.status.slice(1)}</div>
          </div>
          {data.special_requests && (
            <div className="print-field">
              <div className="print-label">Special Requests:</div>
              <div className="print-value">{data.special_requests}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="print-footer">
          <div>Generated on {formatDate(new Date().toISOString())}</div>
          <div>Form ID: {data.id}</div>
        </div>
      </div>

      {/* Close Button (hidden when printing) */}
      <div className="no-print" style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 999999
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Close
        </button>
      </div>
    </>
  )
}
