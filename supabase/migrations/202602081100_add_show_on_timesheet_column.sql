-- =============================================================================
-- Migration: Remove employees table dependency from RLS
-- Date: 2026-02-08
--
-- Changes the is_active_employee() function to simply check that the user
-- is authenticated (auth.uid() IS NOT NULL). Since inactive users are now
-- banned at the Supabase Auth level, they can never obtain a session, so
-- any authenticated user is by definition an active employee.
--
-- This eliminates the dependency on the employees table for authorization.
-- User active status is managed via Supabase Auth ban/unban.
-- show_on_timesheet is stored in auth user app_metadata.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
