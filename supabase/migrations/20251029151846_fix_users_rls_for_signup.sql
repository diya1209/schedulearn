/*
  # Fix Users RLS Policies for Signup

  1. Changes
    - Drop existing INSERT policy that's too restrictive
    - Add new INSERT policy that allows users to create their own profile during signup
    - This works because after auth.signUp(), the user is authenticated

  2. Security
    - Users can only insert records with their own auth.uid()
    - All other policies remain restrictive (view/update own data only)
*/

-- Drop the old insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new insert policy that works during signup
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);