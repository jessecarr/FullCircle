-- Create quotes table (based on special_orders structure)
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  drivers_license VARCHAR(100),
  license_expiration DATE,
  customer_street VARCHAR(255),
  customer_city VARCHAR(100),
  customer_state VARCHAR(50),
  customer_zip VARCHAR(20),
  product_lines JSONB DEFAULT '[]'::jsonb,
  total_price DECIMAL(10, 2) DEFAULT 0,
  delivery_method VARCHAR(50) DEFAULT 'in_store_pickup',
  payment VARCHAR(50) DEFAULT 'not_paid',
  special_requests TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quotes_customer_name ON quotes(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_phone ON quotes(customer_phone);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow authenticated users to access quotes)
CREATE POLICY "Allow authenticated users to read quotes" 
  ON quotes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to insert quotes" 
  ON quotes FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update quotes" 
  ON quotes FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to delete quotes" 
  ON quotes FOR DELETE 
  TO authenticated 
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at_trigger
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quotes_updated_at();
