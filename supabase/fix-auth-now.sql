-- =============================================================================
-- IMMEDIATE FIX: Run this in Supabase SQL Editor NOW
-- Fixes:
-- 1. is_active_employee() search_path linter warning
-- 2. Ensures grafs data is accessible to authenticated active employees
-- =============================================================================

-- Fix 1: Recreate is_active_employee() with explicit search_path
-- This fixes the function_search_path_mutable linter warning
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

-- Fix 2: Verify RLS policies exist for grafs tables
-- These should already exist from the migration, but re-apply to be safe

-- grafs_delivery_schedule
DROP POLICY IF EXISTS "Active employees can read grafs_delivery_schedule" ON public.grafs_delivery_schedule;
CREATE POLICY "Active employees can read grafs_delivery_schedule" ON public.grafs_delivery_schedule
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

DROP POLICY IF EXISTS "Active employees can insert grafs_delivery_schedule" ON public.grafs_delivery_schedule;
CREATE POLICY "Active employees can insert grafs_delivery_schedule" ON public.grafs_delivery_schedule
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS "Active employees can update grafs_delivery_schedule" ON public.grafs_delivery_schedule;
CREATE POLICY "Active employees can update grafs_delivery_schedule" ON public.grafs_delivery_schedule
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS "Active employees can delete grafs_delivery_schedule" ON public.grafs_delivery_schedule;
CREATE POLICY "Active employees can delete grafs_delivery_schedule" ON public.grafs_delivery_schedule
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- grafs_order_tracking
DROP POLICY IF EXISTS "Active employees can read grafs_order_tracking" ON public.grafs_order_tracking;
CREATE POLICY "Active employees can read grafs_order_tracking" ON public.grafs_order_tracking
  FOR SELECT TO authenticated
  USING (public.is_active_employee());

DROP POLICY IF EXISTS "Active employees can insert grafs_order_tracking" ON public.grafs_order_tracking;
CREATE POLICY "Active employees can insert grafs_order_tracking" ON public.grafs_order_tracking
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS "Active employees can update grafs_order_tracking" ON public.grafs_order_tracking;
CREATE POLICY "Active employees can update grafs_order_tracking" ON public.grafs_order_tracking
  FOR UPDATE TO authenticated
  USING (public.is_active_employee())
  WITH CHECK (public.is_active_employee());

DROP POLICY IF EXISTS "Active employees can delete grafs_order_tracking" ON public.grafs_order_tracking;
CREATE POLICY "Active employees can delete grafs_order_tracking" ON public.grafs_order_tracking
  FOR DELETE TO authenticated
  USING (public.is_active_employee());

-- Verification: Check your employees table has matching records for auth users
-- Run this SELECT to verify (don't need to change anything, just check):
-- SELECT e.id, e.email, e.is_active, e.role FROM public.employees e;
-- If any auth users are missing from the employees table, run the
-- sync-employees API endpoint: POST /api/admin/sync-employees
