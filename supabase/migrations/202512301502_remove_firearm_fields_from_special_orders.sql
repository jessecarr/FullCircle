-- Remove firearm-related fields from special_orders table

-- Up migration
ALTER TABLE public.special_orders
DROP COLUMN firearm_type,
DROP COLUMN manufacturer,
DROP COLUMN model,
DROP COLUMN caliber,
DROP COLUMN serial_number,
DROP COLUMN deposit_amount;

-- Down migration (for rollback)
-- This is commented out since Supabase runs the up migration by default
-- ALTER TABLE public.special_orders
-- ADD COLUMN firearm_type text NOT NULL,
-- ADD COLUMN manufacturer text NOT NULL,
-- ADD COLUMN model text NOT NULL,
-- ADD COLUMN caliber text NOT NULL,
-- ADD COLUMN serial_number text,
-- ADD COLUMN deposit_amount numeric;
