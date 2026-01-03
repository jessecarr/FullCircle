-- Check if the superadmin user was created successfully
-- Run this in Supabase SQL Editor to diagnose login issues

-- Check auth.users table
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'superadmin@fullcircle.com';

-- Check employees table
SELECT 
  id,
  email,
  name,
  role,
  is_active,
  created_at
FROM employees
WHERE email = 'superadmin@fullcircle.com';

-- Check auth.identities table
SELECT 
  id,
  provider_id,
  user_id,
  provider,
  created_at
FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'superadmin@fullcircle.com'
);
