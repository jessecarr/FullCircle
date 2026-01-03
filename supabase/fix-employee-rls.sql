-- Temporarily disable RLS on employees table to debug login issue
-- Once login works, we can re-enable with proper policies

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
