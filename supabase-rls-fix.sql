-- Fix RLS policies for license_keys table
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS on license_keys table (simpler)
ALTER TABLE license_keys DISABLE ROW LEVEL SECURITY;

-- Option 2: Or if you want to keep RLS, add these policies:
-- CREATE POLICY "Allow service role to insert"
--   ON license_keys
--   FOR INSERT
--   WITH CHECK (true);

-- CREATE POLICY "Allow service role to select"
--   ON license_keys
--   FOR SELECT
--   USING (true);

-- CREATE POLICY "Allow users to see their own licenses"
--   ON license_keys
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- Verify the table structure
SELECT * FROM information_schema.tables 
WHERE table_name = 'license_keys';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'license_keys';
