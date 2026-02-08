-- =============================================================================
-- Migration: Fix Supabase Linter Security Warnings
-- Date: 2026-02-08
-- 
-- Fixes:
-- 1. Move pg_trgm extension from public to extensions schema
-- 2. Replace all overly permissive RLS policies (USING true / WITH CHECK true)
--    with policies that verify the user is an active employee
-- 3. Fix audit_logs INSERT policy to restrict to service_role only
--
-- NOTE: Enable "Leaked Password Protection" in Supabase Dashboard:
--   Auth > Settings > Password Security
-- =============================================================================

-- ============================================
-- 1. MOVE pg_trgm TO extensions SCHEMA
-- ============================================

CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop dependent index before moving the extension
DROP INDEX IF EXISTS public.idx_lightspeed_items_description_trgm;

DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the index using the operator class from the new schema
CREATE INDEX IF NOT EXISTS idx_lightspeed_items_description_trgm
  ON public.lightspeed_items
  USING gin (description extensions.gin_trgm_ops);

-- ============================================
-- 2. HELPER FUNCTION: is_active_employee()
-- ============================================
-- Reusable check: confirms the current user exists in the employees table
-- and has is_active = true. This is stronger than USING (true) because it:
--   a) Verifies the user is a real employee (not just any authenticated user)
--   b) Respects the is_active flag (deactivated employees are blocked at DB level)

CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================
-- 3. FIX audit_logs INSERT POLICY
-- ============================================
-- The INSERT policy should only allow service_role (used by API routes),
-- not any authenticated user.

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- 4. FIX consignment_forms POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.consignment_forms;

CREATE POLICY "Active employees can read consignment forms" ON public.consignment_forms
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert consignment forms" ON public.consignment_forms
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update consignment forms" ON public.consignment_forms
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete consignment forms" ON public.consignment_forms
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 5. FIX customers POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.customers;

CREATE POLICY "Active employees can read customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 6. FIX fastbound_inventory POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Authenticated users can insert inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Authenticated users can update inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Authenticated users can read inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Users can view inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Users can update inventory" ON public.fastbound_inventory;
DROP POLICY IF EXISTS "Users can delete inventory" ON public.fastbound_inventory;

CREATE POLICY "Active employees can read inventory" ON public.fastbound_inventory
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert inventory" ON public.fastbound_inventory
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update inventory" ON public.fastbound_inventory
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete inventory" ON public.fastbound_inventory
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 7. FIX ffl_contacts POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert FFL contacts" ON public.ffl_contacts;
DROP POLICY IF EXISTS "Authenticated users can update FFL contacts" ON public.ffl_contacts;
DROP POLICY IF EXISTS "Authenticated users can read FFL contacts" ON public.ffl_contacts;

CREATE POLICY "Active employees can read FFL contacts" ON public.ffl_contacts
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert FFL contacts" ON public.ffl_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update FFL contacts" ON public.ffl_contacts
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

-- ============================================
-- 8. FIX grafs_delivery_schedule POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to delete delivery dates" ON public.grafs_delivery_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to insert delivery dates" ON public.grafs_delivery_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to update delivery dates" ON public.grafs_delivery_schedule;
DROP POLICY IF EXISTS "Allow authenticated users to view delivery schedule" ON public.grafs_delivery_schedule;

CREATE POLICY "Active employees can read delivery schedule" ON public.grafs_delivery_schedule
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert delivery dates" ON public.grafs_delivery_schedule
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update delivery dates" ON public.grafs_delivery_schedule
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete delivery dates" ON public.grafs_delivery_schedule
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 9. FIX grafs_order_tracking POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to delete order tracking" ON public.grafs_order_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to insert order tracking" ON public.grafs_order_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to update order tracking" ON public.grafs_order_tracking;
DROP POLICY IF EXISTS "Allow authenticated users to view order tracking" ON public.grafs_order_tracking;

CREATE POLICY "Active employees can read order tracking" ON public.grafs_order_tracking
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert order tracking" ON public.grafs_order_tracking
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update order tracking" ON public.grafs_order_tracking
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete order tracking" ON public.grafs_order_tracking
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 10. FIX inbound_transfers POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete inbound transfers" ON public.inbound_transfers;
DROP POLICY IF EXISTS "Authenticated users can insert inbound transfers" ON public.inbound_transfers;
DROP POLICY IF EXISTS "Authenticated users can update inbound transfers" ON public.inbound_transfers;
DROP POLICY IF EXISTS "Authenticated users can read inbound transfers" ON public.inbound_transfers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.inbound_transfers;

CREATE POLICY "Active employees can read inbound transfers" ON public.inbound_transfers
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert inbound transfers" ON public.inbound_transfers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update inbound transfers" ON public.inbound_transfers
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete inbound transfers" ON public.inbound_transfers
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 11. FIX lightspeed_inventory_log POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert inventory log" ON public.lightspeed_inventory_log;
DROP POLICY IF EXISTS "Authenticated users can update inventory log" ON public.lightspeed_inventory_log;
-- Keep SELECT policy if it exists (SELECT with USING true is fine per linter)

CREATE POLICY "Active employees can insert inventory log" ON public.lightspeed_inventory_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update inventory log" ON public.lightspeed_inventory_log
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

-- ============================================
-- 12. FIX lightspeed_items POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated insert on lightspeed_items" ON public.lightspeed_items;
DROP POLICY IF EXISTS "Allow authenticated update on lightspeed_items" ON public.lightspeed_items;

CREATE POLICY "Active employees can insert lightspeed items" ON public.lightspeed_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update lightspeed items" ON public.lightspeed_items
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

-- ============================================
-- 13. FIX lightspeed_sale_lines POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert sale lines" ON public.lightspeed_sale_lines;
DROP POLICY IF EXISTS "Authenticated users can update sale lines" ON public.lightspeed_sale_lines;

CREATE POLICY "Active employees can insert sale lines" ON public.lightspeed_sale_lines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update sale lines" ON public.lightspeed_sale_lines
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

-- ============================================
-- 14. FIX lightspeed_sync_status POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert sync status" ON public.lightspeed_sync_status;
DROP POLICY IF EXISTS "Authenticated users can update sync status" ON public.lightspeed_sync_status;

CREATE POLICY "Active employees can insert sync status" ON public.lightspeed_sync_status
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update sync status" ON public.lightspeed_sync_status
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

-- ============================================
-- 15. FIX order_number_sequences POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to manage sequences" ON public.order_number_sequences;

CREATE POLICY "Active employees can read sequences" ON public.order_number_sequences
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert sequences" ON public.order_number_sequences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update sequences" ON public.order_number_sequences
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete sequences" ON public.order_number_sequences
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 16. FIX outbound_transfers POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete outbound transfers" ON public.outbound_transfers;
DROP POLICY IF EXISTS "Authenticated users can insert outbound transfers" ON public.outbound_transfers;
DROP POLICY IF EXISTS "Authenticated users can update outbound transfers" ON public.outbound_transfers;
DROP POLICY IF EXISTS "Authenticated users can read outbound transfers" ON public.outbound_transfers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.outbound_transfers;

CREATE POLICY "Active employees can read outbound transfers" ON public.outbound_transfers
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert outbound transfers" ON public.outbound_transfers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update outbound transfers" ON public.outbound_transfers
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete outbound transfers" ON public.outbound_transfers
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 17. FIX quotes POLICIES
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow authenticated users to insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow authenticated users to update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow authenticated users to read quotes" ON public.quotes;

CREATE POLICY "Active employees can read quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert quotes" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update quotes" ON public.quotes
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete quotes" ON public.quotes
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 18. FIX special_orders POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete special orders" ON public.special_orders;
DROP POLICY IF EXISTS "Authenticated users can insert special orders" ON public.special_orders;
DROP POLICY IF EXISTS "Authenticated users can update special orders" ON public.special_orders;
DROP POLICY IF EXISTS "Authenticated users can read special orders" ON public.special_orders;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.special_orders;

CREATE POLICY "Active employees can read special orders" ON public.special_orders
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert special orders" ON public.special_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update special orders" ON public.special_orders
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete special orders" ON public.special_orders
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 19. FIX suppressor_approvals POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete suppressor approvals" ON public.suppressor_approvals;
DROP POLICY IF EXISTS "Authenticated users can insert suppressor approvals" ON public.suppressor_approvals;
DROP POLICY IF EXISTS "Authenticated users can update suppressor approvals" ON public.suppressor_approvals;
DROP POLICY IF EXISTS "Authenticated users can read suppressor approvals" ON public.suppressor_approvals;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.suppressor_approvals;

CREATE POLICY "Active employees can read suppressor approvals" ON public.suppressor_approvals
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert suppressor approvals" ON public.suppressor_approvals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update suppressor approvals" ON public.suppressor_approvals
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete suppressor approvals" ON public.suppressor_approvals
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- ============================================
-- 20. FIX vendors POLICIES
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.vendors;

CREATE POLICY "Active employees can read vendors" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

CREATE POLICY "Active employees can insert vendors" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can update vendors" ON public.vendors
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

CREATE POLICY "Active employees can delete vendors" ON public.vendors
  FOR DELETE TO authenticated
  USING (public.is_active_employee());
