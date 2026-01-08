# RLS Setup for Production

## Overview
Row Level Security (RLS) protects your database by ensuring:
- Users can only see their own data
- The API (service role) can manage licenses
- Public users cannot access sensitive data

## Setup Steps

### 1. Enable RLS Policies
Run the SQL in `supabase-rls-policies.sql` in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** on the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-rls-policies.sql`
5. Click **Run**

### 2. Verify RLS is Enabled
In the Supabase SQL Editor, run:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('license_keys', 'user_profiles')
ORDER BY tablename;
```

You should see `rowsecurity = true` for both tables.

### 3. Verify Policies
Run:

```sql
SELECT tablename, policyname, permissive 
FROM pg_policies 
WHERE tablename IN ('license_keys', 'user_profiles')
ORDER BY tablename, policyname;
```

You should see policies for both tables.

## How It Works

### license_keys Table
- **Service role** (API) can insert, read, update licenses
- **Users** can only read their own licenses
- **Anonymous users** cannot access any licenses

### user_profiles Table
- **Service role** (API) can manage profiles
- **Users** can read and update their own profile
- **Anonymous users** cannot access profiles

## Testing

### Test: User can claim trial
1. Sign up as a new user
2. Click "Claim Free Trial"
3. Check browser console for success message
4. Check Supabase dashboard → **license_keys** table to see the inserted row

### Test: User cannot claim twice
1. Sign up as a new user
2. Click "Claim Free Trial" → Should succeed
3. Click "Claim Free Trial" again → Should show existing license info instead of error
4. Check you see the existing license details

### Test: User can view their own license
1. Navigate to `/dashboard`
2. You should see your license key, expiration date, and subscription status
3. Verify all information matches what's in the database

## Troubleshooting

### Error: "permission denied for schema public"
- The policy syntax is incorrect
- Verify you're using `auth.uid()` correctly
- Check that the service role has sufficient permissions

### Error: "relation does not exist"
- The table might not exist
- Run: `SELECT * FROM information_schema.tables WHERE table_name = 'license_keys';`

### Service role can't insert
- Verify the service role is being used in the API
- Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify the policy allows service role inserts

### Users can't see their licenses
- Check that `auth.uid()` returns the correct user ID
- Verify the user_id in the license_keys table matches the user's auth.uid()

## Additional Security Notes

1. **Never disable RLS in production** - The SQL file initially had `DISABLE ROW LEVEL SECURITY` for testing, but production should use the policies above

2. **Service Role Protection** - The service role key should never be exposed in client code. It's only used server-side in API routes.

3. **User Privacy** - With these policies, users can only see their own licenses, ensuring privacy

4. **API Security** - All API endpoints use the service role, which can bypass these policies, but the application logic still validates ownership

## Next Steps

After enabling RLS:
1. Test the trial claim flow end-to-end
2. Verify error handling works when users try to claim twice
3. Check the dashboard shows the correct subscription status
4. Monitor Supabase logs for any RLS-related errors
