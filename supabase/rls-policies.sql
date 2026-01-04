-- Row Level Security (RLS) Policies for FullCircle Application
-- Run this script in your Supabase SQL Editor to enable secure access without service role key

-- ============================================
-- EMPLOYEES TABLE POLICIES
-- ============================================

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own employee record
CREATE POLICY "Users can read own employee record"
ON employees
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Users can update their own employee record (limited fields)
CREATE POLICY "Users can update own employee record"
ON employees
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- SPECIAL ORDERS TABLE POLICIES
-- ============================================

-- Enable RLS on special_orders table
ALTER TABLE special_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all special orders
CREATE POLICY "Authenticated users can read special orders"
ON special_orders
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert special orders
CREATE POLICY "Authenticated users can insert special orders"
ON special_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update special orders
CREATE POLICY "Authenticated users can update special orders"
ON special_orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete special orders
CREATE POLICY "Authenticated users can delete special orders"
ON special_orders
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- INBOUND TRANSFERS TABLE POLICIES
-- ============================================

-- Enable RLS on inbound_transfers table
ALTER TABLE inbound_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all inbound transfers
CREATE POLICY "Authenticated users can read inbound transfers"
ON inbound_transfers
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert inbound transfers
CREATE POLICY "Authenticated users can insert inbound transfers"
ON inbound_transfers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update inbound transfers
CREATE POLICY "Authenticated users can update inbound transfers"
ON inbound_transfers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete inbound transfers
CREATE POLICY "Authenticated users can delete inbound transfers"
ON inbound_transfers
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- OUTBOUND TRANSFERS TABLE POLICIES
-- ============================================

-- Enable RLS on outbound_transfers table
ALTER TABLE outbound_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all outbound transfers
CREATE POLICY "Authenticated users can read outbound transfers"
ON outbound_transfers
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert outbound transfers
CREATE POLICY "Authenticated users can insert outbound transfers"
ON outbound_transfers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update outbound transfers
CREATE POLICY "Authenticated users can update outbound transfers"
ON outbound_transfers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete outbound transfers
CREATE POLICY "Authenticated users can delete outbound transfers"
ON outbound_transfers
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- SUPPRESSOR APPROVALS TABLE POLICIES
-- ============================================

-- Enable RLS on suppressor_approvals table
ALTER TABLE suppressor_approvals ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all suppressor approvals
CREATE POLICY "Authenticated users can read suppressor approvals"
ON suppressor_approvals
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert suppressor approvals
CREATE POLICY "Authenticated users can insert suppressor approvals"
ON suppressor_approvals
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update suppressor approvals
CREATE POLICY "Authenticated users can update suppressor approvals"
ON suppressor_approvals
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete suppressor approvals
CREATE POLICY "Authenticated users can delete suppressor approvals"
ON suppressor_approvals
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- FASTBOUND INVENTORY TABLE POLICIES
-- ============================================

-- Enable RLS on fastbound_inventory table (if it exists)
ALTER TABLE fastbound_inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all inventory
CREATE POLICY "Authenticated users can read inventory"
ON fastbound_inventory
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can insert inventory
CREATE POLICY "Authenticated users can insert inventory"
ON fastbound_inventory
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Authenticated users can update inventory
CREATE POLICY "Authenticated users can update inventory"
ON fastbound_inventory
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can delete inventory
CREATE POLICY "Authenticated users can delete inventory"
ON fastbound_inventory
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- NOTES
-- ============================================
-- These policies allow all authenticated users to perform CRUD operations
-- on all tables except employees, where users can only access their own record.
-- 
-- If you need more granular permissions based on roles (admin, manager, employee),
-- you can modify these policies to check the user's role from the employees table.
-- 
-- Example for role-based access:
-- USING (
--   EXISTS (
--     SELECT 1 FROM employees 
--     WHERE id = auth.uid() 
--     AND role IN ('admin', 'manager')
--   )
-- )
