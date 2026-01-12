-- Update status constraints to include new status values: backorder, quote, layaway, partially_received

-- Drop existing status constraints on special_orders
ALTER TABLE special_orders DROP CONSTRAINT IF EXISTS status_check;
ALTER TABLE special_orders DROP CONSTRAINT IF EXISTS special_orders_status_check;

-- Add new constraint with all status values
ALTER TABLE special_orders ADD CONSTRAINT special_orders_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'received', 'completed', 'cancelled'));

-- Update inbound_transfers status constraint
ALTER TABLE inbound_transfers DROP CONSTRAINT IF EXISTS inbound_transfers_status_check;
ALTER TABLE inbound_transfers ADD CONSTRAINT inbound_transfers_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'received', 'completed', 'cancelled', 'shipped', 'delivered'));

-- Update outbound_transfers status constraint
ALTER TABLE outbound_transfers DROP CONSTRAINT IF EXISTS outbound_transfers_status_check;
ALTER TABLE outbound_transfers ADD CONSTRAINT outbound_transfers_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'received', 'completed', 'cancelled', 'shipped', 'delivered'));

-- Update suppressor_approvals status constraint
ALTER TABLE suppressor_approvals DROP CONSTRAINT IF EXISTS suppressor_approvals_status_check;
ALTER TABLE suppressor_approvals ADD CONSTRAINT suppressor_approvals_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'received', 'completed', 'cancelled', 'shipped', 'delivered'));

-- Add previous_status column to special_orders for tracking status before partially_received
ALTER TABLE special_orders ADD COLUMN IF NOT EXISTS previous_status TEXT;
