-- Drop existing tables if they exist
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS special_orders CASCADE;
DROP TABLE IF EXISTS inbound_transfers CASCADE;
DROP TABLE IF EXISTS suppressor_approvals CASCADE;
DROP TABLE IF EXISTS outbound_transfers CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create special_orders table
CREATE TABLE special_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_street TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  product_lines JSONB NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'in_store_pickup' CHECK (delivery_method IN ('in_store_pickup', 'ship_to_customer')),
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create other tables (inbound_transfers, suppressor_approvals, outbound_transfers)
-- [Include similar CREATE TABLE statements for other tables]

-- Create indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_special_orders_status ON special_orders(status);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_orders_updated_at BEFORE UPDATE ON special_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for all users" ON customers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON special_orders
  FOR ALL USING (true) WITH CHECK (true);
