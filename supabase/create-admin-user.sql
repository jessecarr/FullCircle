-- Create Admin User in Supabase
-- This script creates an admin user that you can use to login
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- IMPORTANT: Change the email and password below to your desired credentials
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create the auth user with email and password
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    raw_app_meta_data,
    raw_user_meta_data
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'superadmin@fullcircle.com',  -- CHANGE THIS to your email
    crypt('SuperAdmin123!', gen_salt('bf')),  -- CHANGE THIS to your password
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"name":"System Administrator","role":"admin"}'
  )
  RETURNING id INTO new_user_id;

  -- Create the employee record
  INSERT INTO employees (id, email, name, role, is_active, password_hash)
  VALUES (
    new_user_id,
    'superadmin@fullcircle.com',  -- CHANGE THIS to match the email above
    'System Administrator',
    'admin',
    true,
    'placeholder_hash'
  );

  -- Create identity record
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id::text,
    new_user_id,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, 'superadmin@fullcircle.com')::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'User created successfully with ID: %', new_user_id;
END $$;
