-- Add pto_notes column for PTO descriptions
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS pto_notes text;

-- Add holiday_name column for tracking which holiday
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS holiday_name text;

-- Add comment for documentation
COMMENT ON COLUMN timesheets.pto_notes IS 'Description/reason for PTO hours';
COMMENT ON COLUMN timesheets.holiday_name IS 'Name of the federal holiday';
