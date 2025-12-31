-- Create vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on vendor name for faster searches
CREATE INDEX idx_vendors_name ON vendors(name);

-- Add trigger for updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Enable all operations for all users" ON vendors
  FOR ALL USING (true) WITH CHECK (true);

-- Insert initial vendor data from CSV
INSERT INTO vendors (name) VALUES
  ('AADLAND'),
  ('AB SUPPRESSOR'),
  ('AERO PRECISION'),
  ('ALPHA MUNITIONS'),
  ('AMERICAN DEFENSE MFG'),
  ('AMERICAN OUTDOOR BRAND'),
  ('AREA 419'),
  ('ARMAGEDDON GEAR'),
  ('ATHLON'),
  ('B&T INDUSTRIES LLC'),
  ('BERRY MANUFACTURING'),
  ('BILLET PRECISION'),
  ('BLUE FORCE GEAR'),
  ('BROWNING'),
  ('CHATTANOOGA'),
  ('CLAYBUSTER'),
  ('CLOUD DEFENSIVE'),
  ('CROSS MACHINE TOOL (CMT)'),
  ('CROW SHOOTING SUPPLY'),
  ('DAVIDSON''S INC.'),
  ('DILLON PRECISION'),
  ('EBERLESTOCK'),
  ('EURO OPTIC'),
  ('FIX-IT-STICKS'),
  ('FLITZ'),
  ('FOUNDATION STOCKS'),
  ('GARMIN'),
  ('GRAF & SONS'),
  ('GRAY OPS'),
  ('GRIFFIN ARMAMENT'),
  ('HAWKINS PRECISON'),
  ('HOP MUNITIONS'),
  ('HORNADY'),
  ('IMMEDIATE ACTION ARMOR'),
  ('IMPACT PRECISION SHOOTING'),
  ('INLINE FABRICATION'),
  ('J. DEWEY'),
  ('KAHLES'),
  ('KAK'),
  ('LEUPOLD OPTICS'),
  ('LIPSEY''S'),
  ('LONE PEAK'),
  ('MAGPUL'),
  ('MANNERS'),
  ('MANTIS'),
  ('MDT'),
  ('MEC'),
  ('MILE HIGH SHOOTING'),
  ('MISSOURI BULLET COMPANY'),
  ('MTM'),
  ('NEBO TOOLS'),
  ('PARAPET COMPONENTS'),
  ('PRIMARY ARMS'),
  ('PRO-SHOT'),
  ('PROTEKTOR'),
  ('RADIANS'),
  ('RADICAL FIREARMS'),
  ('RAUCH PRECISION'),
  ('RSR GROUP'),
  ('RUGGED'),
  ('SAFARILAND'),
  ('SHORT ACTION CUSTOMS'),
  ('SHORT ACTION PRECISION'),
  ('SILENCER CO.'),
  ('SILENCER SHOP'),
  ('SPORTS SOUTH'),
  ('SPUHR'),
  ('STARLINE BRASS'),
  ('SWAROVSKI OPTIK'),
  ('TANGO INNOVATIONS'),
  ('THUNDER BEAST ARMS'),
  ('TION INC'),
  ('TRIGGERTECH'),
  ('TWO VETS TRIPODS'),
  ('VORTEX OPTICS'),
  ('WALSH CUSTOM DEFENSE'),
  ('WIEBAD'),
  ('WINCHESTER'),
  ('WIPE OUT INC'),
  ('WOOX'),
  ('ZANDERS SPORTING GOODS'),
  ('ZERO COMPROMISE OPTIC (ZCO)');
