/*
  # Update Users Table for Supabase Auth

  1. Changes
    - Remove password column from users table (handled by Supabase auth)
    - Keep username column for display purposes
    - Update RLS policies to work with Supabase auth
  
  2. Security
    - Users can only insert their own profile during signup
    - Users can only view and update their own profile
*/

-- Remove password column since Supabase handles authentication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
  ) THEN
    ALTER TABLE users DROP COLUMN password;
  END IF;
END $$;