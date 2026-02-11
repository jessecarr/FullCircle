-- Add pending_consignment to ALL table status constraints
-- Also add consignment_forms status constraint which was missing

-- Update special_orders
ALTER TABLE special_orders DROP CONSTRAINT IF EXISTS special_orders_status_check;
ALTER TABLE special_orders ADD CONSTRAINT special_orders_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'pending_consignment', 'received', 'completed', 'cancelled'));

-- Update inbound_transfers
ALTER TABLE inbound_transfers DROP CONSTRAINT IF EXISTS inbound_transfers_status_check;
ALTER TABLE inbound_transfers ADD CONSTRAINT inbound_transfers_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'pending_consignment', 'received', 'completed', 'cancelled', 'shipped', 'delivered'));

-- Update outbound_transfers
ALTER TABLE outbound_transfers DROP CONSTRAINT IF EXISTS outbound_transfers_status_check;
ALTER TABLE outbound_transfers ADD CONSTRAINT outbound_transfers_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'pending_consignment', 'received', 'completed', 'cancelled', 'shipped', 'delivered'));

-- Update suppressor_approvals
ALTER TABLE suppressor_approvals DROP CONSTRAINT IF EXISTS suppressor_approvals_status_check;
ALTER TABLE suppressor_approvals ADD CONSTRAINT suppressor_approvals_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'pending_consignment', 'received', 'completed', 'cancelled', 'shipped', 'delivered'));

-- Add consignment_forms status constraint (was missing entirely)
ALTER TABLE consignment_forms DROP CONSTRAINT IF EXISTS consignment_forms_status_check;
ALTER TABLE consignment_forms ADD CONSTRAINT consignment_forms_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'pending_consignment', 'received', 'completed', 'cancelled', 'active', 'sold', 'returned'));

-- Update quotes table constraint if it exists
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('pending', 'ordered', 'backorder', 'layaway', 'quote', 'partially_received', 'pending_consignment', 'received', 'completed', 'cancelled'));
