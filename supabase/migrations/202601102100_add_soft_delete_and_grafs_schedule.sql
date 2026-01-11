-- Add soft delete support to all form tables
-- Add deleted_at column to track when forms are soft-deleted

-- Special Orders
ALTER TABLE special_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE special_orders ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Inbound Transfers
ALTER TABLE inbound_transfers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE inbound_transfers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Outbound Transfers
ALTER TABLE outbound_transfers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE outbound_transfers ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Suppressor Approvals
ALTER TABLE suppressor_approvals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE suppressor_approvals ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Consignment Forms
ALTER TABLE consignment_forms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE consignment_forms ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create indexes for soft-deleted queries
CREATE INDEX IF NOT EXISTS idx_special_orders_deleted_at ON special_orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_inbound_transfers_deleted_at ON inbound_transfers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_outbound_transfers_deleted_at ON outbound_transfers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_suppressor_approvals_deleted_at ON suppressor_approvals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_consignment_forms_deleted_at ON consignment_forms(deleted_at);

-- Graf & Sons Delivery Schedule Table
CREATE TABLE IF NOT EXISTS grafs_delivery_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_date DATE NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for delivery date lookups
CREATE INDEX IF NOT EXISTS idx_grafs_delivery_date ON grafs_delivery_schedule(delivery_date);

-- Graf & Sons Order Tracking Table
-- Tracks special orders with Graf & Sons vendor that need arrival tracking
CREATE TABLE IF NOT EXISTS grafs_order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_order_id UUID NOT NULL REFERENCES special_orders(id) ON DELETE CASCADE,
  product_line_index INTEGER NOT NULL, -- Index of the product line in special_orders.product_lines
  expected_delivery_date DATE NOT NULL,
  arrived BOOLEAN DEFAULT FALSE,
  arrived_at TIMESTAMPTZ,
  arrived_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(special_order_id, product_line_index)
);

-- Create indexes for Graf tracking queries
CREATE INDEX IF NOT EXISTS idx_grafs_tracking_expected_date ON grafs_order_tracking(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_grafs_tracking_arrived ON grafs_order_tracking(arrived);
CREATE INDEX IF NOT EXISTS idx_grafs_tracking_special_order ON grafs_order_tracking(special_order_id);

-- Enable RLS
ALTER TABLE grafs_delivery_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE grafs_order_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Graf's Delivery Schedule
CREATE POLICY "Allow authenticated users to view delivery schedule"
  ON grafs_delivery_schedule FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert delivery dates"
  ON grafs_delivery_schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update delivery dates"
  ON grafs_delivery_schedule FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete delivery dates"
  ON grafs_delivery_schedule FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for Graf's Order Tracking
CREATE POLICY "Allow authenticated users to view order tracking"
  ON grafs_order_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert order tracking"
  ON grafs_order_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update order tracking"
  ON grafs_order_tracking FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete order tracking"
  ON grafs_order_tracking FOR DELETE
  TO authenticated
  USING (true);
