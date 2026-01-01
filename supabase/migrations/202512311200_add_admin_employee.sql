-- Insert Admin employee account
-- This will create both the auth user and employee record

-- First, let's insert the employee record directly
-- You'll need to get the user ID from Supabase Auth after creating the user manually

INSERT INTO employees (
  id,
  email,
  password_hash,
  name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'PLACEHOLDER_USER_ID', -- Replace this with the actual user ID from Supabase Auth
  'Admin@fullcircle.com',
  'b8c0c8a5f8a8d8e8f8a8d8e8f8a8d8e8f8a8d8e8f8a8d8e8f8a8d8e8f8a8d8e8', -- This is a placeholder hash
  'System Administrator',
  'admin',
  true,
  NOW(),
  NOW()
);

-- Alternative: Create a simple function to verify employee exists
CREATE OR REPLACE FUNCTION verify_employee(employee_email TEXT, employee_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  employee_record RECORD;
BEGIN
  -- Check if employee exists and is active
  SELECT id, role INTO employee_record
  FROM employees
  WHERE email = LOWER(employee_email)
    AND is_active = true;
  
  -- Return true if employee exists (password verification would need to be done in the app)
  RETURN FOUND;
END;
$$;
