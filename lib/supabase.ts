import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>
      }
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Employee, 'id' | 'created_at'>>
      }
      special_orders: {
        Row: SpecialOrderForm
        Insert: Omit<SpecialOrderForm, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SpecialOrderForm, 'id' | 'created_at'>>
      }
      inbound_transfers: {
        Row: InboundTransferForm
        Insert: Omit<InboundTransferForm, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InboundTransferForm, 'id' | 'created_at'>>
      }
      suppressor_approvals: {
        Row: SuppressorApprovalForm
        Insert: Omit<SuppressorApprovalForm, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SuppressorApprovalForm, 'id' | 'created_at'>>
      }
      outbound_transfers: {
        Row: OutboundTransferForm
        Insert: Omit<OutboundTransferForm, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<OutboundTransferForm, 'id' | 'created_at'>>
      }
    }
  }
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  street?: string
  city?: string
  state?: string
  zip?: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'manager' | 'employee'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SpecialOrderForm {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_street?: string
  customer_city?: string
  customer_state?: string
  customer_zip?: string
  product_lines: any[]
  total_price: number
  delivery_method: 'in_store_pickup' | 'ship_to_customer'
  special_requests?: string
  status: 'pending' | 'ordered' | 'received' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface InboundTransferForm {
  id: string
  transferor_name: string
  transferor_ffl?: string
  transferor_address: string
  transferor_city: string
  transferor_state: string
  transferor_zip: string
  firearm_type: string
  manufacturer: string
  model: string
  caliber: string
  serial_number: string
  transfer_date: string
  atf_form_type: string
  tracking_number?: string
  notes?: string
  status: 'pending' | 'in_transit' | 'received' | 'completed'
  created_at: string
  updated_at: string
}

export interface SuppressorApprovalForm {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  customer_city: string
  customer_state: string
  customer_zip: string
  suppressor_manufacturer: string
  suppressor_model: string
  suppressor_caliber: string
  suppressor_serial_number: string
  trust_name?: string
  form_type: 'Form 1' | 'Form 4'
  submission_date: string
  approval_date?: string
  tax_stamp_number?: string
  examiner_name?: string
  status: 'pending' | 'submitted' | 'approved' | 'denied' | 'picked_up'
  notes?: string
  created_at: string
  updated_at: string
}

export interface OutboundTransferForm {
  id: string
  transferee_name: string
  transferee_ffl?: string
  transferee_address: string
  transferee_city: string
  transferee_state: string
  transferee_zip: string
  firearm_type: string
  manufacturer: string
  model: string
  caliber: string
  serial_number: string
  transfer_date: string
  atf_form_type: string
  tracking_number?: string
  carrier?: string
  notes?: string
  status: 'pending' | 'shipped' | 'delivered' | 'completed'
  created_at: string
  updated_at: string
}
