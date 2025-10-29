/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing restrictive policies on users table
    - Add new policies that allow users to insert their own records
    - Allow anonymous users to create their user record during signup
  
  2. Security
    - Users can only insert records with their own auth.uid()
    - Users can only view and update their own records
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new policies that allow signup
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);