-- Add RLS policy for service role to update user_profiles
-- Run this in your Supabase SQL Editor

-- First, ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role to update user_profiles
CREATE POLICY "Service role can update user_profiles"
  ON user_profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow service role to insert into user_profiles
CREATE POLICY "Service role can insert user_profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to select user_profiles
CREATE POLICY "Service role can read user_profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Keep the existing user policies
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify policies
SELECT tablename, policyname, permissive 
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
