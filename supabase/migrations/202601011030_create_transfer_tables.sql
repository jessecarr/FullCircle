-- Create inbound_transfers table
CREATE TABLE IF NOT EXISTS inbound_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_street TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  product_lines JSONB NOT NULL DEFAULT '[]',
  total_price DECIMAL(10, 2) DEFAULT 0,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'completed', 'cancelled', 'shipped', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outbound_transfers table
CREATE TABLE IF NOT EXISTS outbound_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_street TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  transferee_name TEXT,
  transferee_phone TEXT,
  transferee_ffl_name TEXT,
  transferee_ffl_address TEXT,
  transferee_ffl_city TEXT,
  transferee_ffl_state TEXT,
  transferee_ffl_zip TEXT,
  product_lines JSONB NOT NULL DEFAULT '[]',
  total_price DECIMAL(10, 2) DEFAULT 0,
  disposition_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'completed', 'cancelled', 'shipped', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppressor_approvals table
CREATE TABLE IF NOT EXISTS suppressor_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  customer_street TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip TEXT,
  product_lines JSONB NOT NULL DEFAULT '[]',
  total_price DECIMAL(10, 2) DEFAULT 0,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received', 'completed', 'cancelled', 'shipped', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inbound_transfers_status ON inbound_transfers(status);
CREATE INDEX IF NOT EXISTS idx_outbound_transfers_status ON outbound_transfers(status);
CREATE INDEX IF NOT EXISTS idx_suppressor_approvals_status ON suppressor_approvals(status);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_inbound_transfers_updated_at ON inbound_transfers;
CREATE TRIGGER update_inbound_transfers_updated_at BEFORE UPDATE ON inbound_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_outbound_transfers_updated_at ON outbound_transfers;
CREATE TRIGGER update_outbound_transfers_updated_at BEFORE UPDATE ON outbound_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppressor_approvals_updated_at ON suppressor_approvals;
CREATE TRIGGER update_suppressor_approvals_updated_at BEFORE UPDATE ON suppressor_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE inbound_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressor_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Enable all operations for all users" ON inbound_transfers;
CREATE POLICY "Enable all operations for all users" ON inbound_transfers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON outbound_transfers;
CREATE POLICY "Enable all operations for all users" ON outbound_transfers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations for all users" ON suppressor_approvals;
CREATE POLICY "Enable all operations for all users" ON suppressor_approvals
  FOR ALL USING (true) WITH CHECK (true);
