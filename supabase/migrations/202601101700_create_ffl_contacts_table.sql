-- Create FFL Contacts table for storing ATF FFL database
CREATE TABLE IF NOT EXISTS ffl_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number VARCHAR(20) UNIQUE NOT NULL,
  license_name VARCHAR(255),
  trade_name VARCHAR(255),
  premise_address VARCHAR(255),
  premise_city VARCHAR(100),
  premise_state VARCHAR(2),
  premise_zip VARCHAR(10),
  phone VARCHAR(20),
  license_type VARCHAR(50),
  license_expires DATE,
  business_type VARCHAR(100),
  last_synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_ffl_license_number ON ffl_contacts(license_number);
CREATE INDEX IF NOT EXISTS idx_ffl_license_name ON ffl_contacts(license_name);
CREATE INDEX IF NOT EXISTS idx_ffl_trade_name ON ffl_contacts(trade_name);
CREATE INDEX IF NOT EXISTS idx_ffl_state ON ffl_contacts(premise_state);
CREATE INDEX IF NOT EXISTS idx_ffl_city ON ffl_contacts(premise_city);

-- Create GIN index for full-text search on name fields
CREATE INDEX IF NOT EXISTS idx_ffl_name_search ON ffl_contacts USING GIN (
  to_tsvector('english', COALESCE(license_name, '') || ' ' || COALESCE(trade_name, ''))
);

-- Enable Row Level Security
ALTER TABLE ffl_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read FFL contacts
CREATE POLICY "Authenticated users can read FFL contacts"
  ON ffl_contacts
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to insert FFL contacts
CREATE POLICY "Authenticated users can insert FFL contacts"
  ON ffl_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to update FFL contacts
CREATE POLICY "Authenticated users can update FFL contacts"
  ON ffl_contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE ffl_contacts IS 'Federal Firearms License contacts from ATF database for FFL lookup';
