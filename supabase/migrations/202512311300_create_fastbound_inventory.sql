-- Create FastBound inventory table
CREATE TABLE IF NOT EXISTS fastbound_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fastbound_item_id TEXT UNIQUE NOT NULL, -- FastBound Item ID (GUID)
  fastbound_acquisition_id TEXT, -- Associated acquisition ID
  control_number TEXT, -- Control number from your form
  firearm_type TEXT NOT NULL, -- Handgun, Rifle, Shotgun, etc.
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  caliber TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  date_acquired TIMESTAMP WITH TIME ZONE, -- When item was acquired
  acquisition_source TEXT, -- Source of acquisition
  status TEXT DEFAULT 'in_stock', -- in_stock, sold, transferred_out, etc.
  price DECIMAL(10,2), -- Purchase/sale price
  notes TEXT,
  metadata JSONB, -- Additional FastBound data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fastbound_inventory_fastbound_item_id ON fastbound_inventory(fastbound_item_id);
CREATE INDEX IF NOT EXISTS idx_fastbound_inventory_serial_number ON fastbound_inventory(serial_number);
CREATE INDEX IF NOT EXISTS idx_fastbound_inventory_control_number ON fastbound_inventory(control_number);
CREATE INDEX IF NOT EXISTS idx_fastbound_inventory_status ON fastbound_inventory(status);

-- Enable RLS (Row Level Security)
ALTER TABLE fastbound_inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read inventory
CREATE POLICY "Users can view inventory" ON fastbound_inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to insert inventory
CREATE POLICY "Users can insert inventory" ON fastbound_inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for authenticated users to update inventory
CREATE POLICY "Users can update inventory" ON fastbound_inventory
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policy for authenticated users to delete inventory
CREATE POLICY "Users can delete inventory" ON fastbound_inventory
  FOR DELETE USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_fastbound_inventory_updated_at
  BEFORE UPDATE ON fastbound_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
