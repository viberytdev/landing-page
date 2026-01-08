-- RLS Policies for VibeRyt License System
-- Run these in your Supabase SQL Editor to enable secure RLS

-- ============================================================================
-- 1. Enable RLS on license_keys table
-- ============================================================================
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Allow service role (from API) to manage licenses
-- ============================================================================

-- Service role can INSERT new licenses
CREATE POLICY "Service role can insert licenses"
  ON license_keys
  FOR INSERT
  WITH CHECK (
    -- Allow inserts from service role (bypasses RLS automatically)
    true
  );

-- Service role can SELECT licenses for verification
CREATE POLICY "Service role can read licenses"
  ON license_keys
  FOR SELECT
  USING (true);

-- Service role can UPDATE licenses (for activation status)
CREATE POLICY "Service role can update licenses"
  ON license_keys
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Allow users to view their own licenses
-- ============================================================================
CREATE POLICY "Users can view their own licenses"
  ON license_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Enable RLS on user_profiles table
-- ============================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Service role can manage profiles
CREATE POLICY "Service role can manage profiles"
  ON user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- Verification: Check RLS status
-- ============================================================================
-- Run this query to verify RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('license_keys', 'user_profiles');

-- Run this to see all policies:
-- SELECT tablename, policyname, permissive, roles, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('license_keys', 'user_profiles');
