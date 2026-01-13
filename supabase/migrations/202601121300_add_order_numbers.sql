-- Add order_number column to all form tables
-- Format: PREFIX-YEAR-SEQUENCE (e.g., SPC-2026-0001)

-- Special Orders
ALTER TABLE special_orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NULL;
CREATE INDEX IF NOT EXISTS idx_special_orders_order_number ON special_orders(order_number);

-- Inbound Transfers
ALTER TABLE inbound_transfers ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_transfers_order_number ON inbound_transfers(order_number);

-- Outbound Transfers
ALTER TABLE outbound_transfers ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_transfers_order_number ON outbound_transfers(order_number);

-- Suppressor Approvals
ALTER TABLE suppressor_approvals ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NULL;
CREATE INDEX IF NOT EXISTS idx_suppressor_approvals_order_number ON suppressor_approvals(order_number);

-- Consignments
ALTER TABLE consignments ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NULL;
CREATE INDEX IF NOT EXISTS idx_consignments_order_number ON consignments(order_number);

-- Quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS order_number VARCHAR(20) NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_order_number ON quotes(order_number);

-- Create a table to track order number sequences per form type per year
CREATE TABLE IF NOT EXISTS order_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(form_type, year)
);

-- Enable RLS on order_number_sequences
ALTER TABLE order_number_sequences ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and update sequences
CREATE POLICY "Allow authenticated users to manage sequences" ON order_number_sequences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number(p_form_type VARCHAR, p_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_year INTEGER;
  v_sequence INTEGER;
  v_order_number VARCHAR;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Insert or update the sequence, returning the new sequence number
  INSERT INTO order_number_sequences (form_type, year, last_sequence)
  VALUES (p_form_type, v_year, 1)
  ON CONFLICT (form_type, year) 
  DO UPDATE SET 
    last_sequence = order_number_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO v_sequence;
  
  -- Format: PREFIX-YEAR-SEQUENCE (padded to 4 digits)
  v_order_number := p_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;
