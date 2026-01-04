-- Verify the employee record exists and check if RLS is blocking access
-- Run this to see if the employee record was created

-- Check if employee exists (bypassing RLS)
SELECT 
  id,
  email,
  name,
  role,
  is_active
FROM employees
WHERE id = 'eb5c25cf-08fa-4481-928b-e6eb9c420cb3';

-- If no results, the employee record wasn't created
-- Let's create it now:

INSERT INTO employees (id, email, name, role, is_active, password_hash)
VALUES (
  'eb5c25cf-08fa-4481-928b-e6eb9c420cb3',
  'superadmin@fullcircle.com',
  'System Administrator',
  'admin',
  true,
  'placeholder_hash'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Verify it was created
SELECT 
  id,
  email,
  name,
  role,
  is_active
FROM employees
WHERE id = 'eb5c25cf-08fa-4481-928b-e6eb9c420cb3';
