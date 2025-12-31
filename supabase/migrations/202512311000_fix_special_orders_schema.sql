-- Fix special_orders schema issues
-- This migration ensures all required columns exist in the special_orders table

-- Check if delivery_method column exists, add it if it doesn't
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_orders' 
        AND column_name = 'delivery_method'
    ) THEN
        ALTER TABLE special_orders ADD COLUMN delivery_method TEXT NOT NULL DEFAULT 'in_store_pickup';
        ALTER TABLE special_orders ADD CONSTRAINT delivery_method_check CHECK (delivery_method IN ('in_store_pickup', 'ship_to_customer'));
    END IF;
    
    -- Check if special_requests column exists, add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_orders' 
        AND column_name = 'special_requests'
    ) THEN
        ALTER TABLE special_orders ADD COLUMN special_requests TEXT;
    END IF;
    
    -- Check if status column exists, add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_orders' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE special_orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        ALTER TABLE special_orders ADD CONSTRAINT status_check CHECK (status IN ('pending', 'ordered', 'received', 'completed', 'cancelled'));
    END IF;
    
    -- Check if total_price column exists, add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_orders' 
        AND column_name = 'total_price'
    ) THEN
        ALTER TABLE special_orders ADD COLUMN total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
    END IF;
    
    -- Check if product_lines column exists, add it if it doesn't
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_orders' 
        AND column_name = 'product_lines'
    ) THEN
        ALTER TABLE special_orders ADD COLUMN product_lines JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst;
