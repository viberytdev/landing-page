-- Disable RLS on user_profiles (safe because it's only accessed by API backend)
-- Run this in your Supabase SQL Editor

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on license_keys (users need specific access policies)
-- ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;  -- Already enabled

-- Verify status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('license_keys', 'user_profiles')
ORDER BY tablename;
