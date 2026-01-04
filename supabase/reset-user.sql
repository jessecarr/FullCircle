-- Delete the existing user so we can recreate through Dashboard
-- Run this in Supabase SQL Editor

-- Delete identity
DELETE FROM auth.identities 
WHERE user_id = 'eb5c25cf-08fa-4481-928b-e6eb9c420cb3';

-- Delete auth user
DELETE FROM auth.users 
WHERE id = 'eb5c25cf-08fa-4481-928b-e6eb9c420cb3';

-- Keep the employee record (we'll link it later)
-- Or delete it too if you want a fresh start:
-- DELETE FROM employees WHERE id = 'eb5c25cf-08fa-4481-928b-e6eb9c420cb3';
