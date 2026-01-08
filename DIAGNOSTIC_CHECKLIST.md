# Quick Diagnostic Checklist

Use this checklist to diagnose any remaining issues with the trial claim flow.

## Pre-Test Checklist

- [ ] Browser console is open (F12 → Console)
- [ ] You're not logged in (or use incognito mode)
- [ ] Using a fresh email for signup
- [ ] `.env.local` has all required variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `LICENSE_KEY_SECRET` (optional)

## Step-by-Step Test

### Step 1: Click "Claim Free Trial"
- [ ] Console shows: `[Session] License intent set to: trial`
- [ ] Console shows: `[Flow] User not authenticated, setting intent and redirecting to signup`
- [ ] Redirected to `/auth/signup?source=trial`
- [ ] URL shows `source=trial` parameter

**If this fails:**
- Check console for any errors
- Verify Pricing component loaded correctly
- Try refreshing page

### Step 2: Signup
- [ ] Form appears
- [ ] Enter email: `test_trial_@example.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Confirm password: `TestPassword123!`
- [ ] Click "Create Account"

### Step 3: Account Created
- [ ] Console shows: `[Signup] User created: <uuid>`
- [ ] Console shows: `[Signup] Session intent: trial`
- [ ] Console shows: `[Signup] Attempting to claim trial license`

**If stuck here:**
- Check Network tab: any failed requests?
- Check Supabase: did user get created in Auth?
- Check browser: is page responsive?

### Step 4: API Call
- [ ] Console shows: `[API] Claim trial request for user: <uuid>`
- [ ] Console shows: `[API] Verifying user exists...`
- [ ] Console shows: `[API] User found, email: test_trial_@example.com`

**If JSON parse error appears here:**
- Open Network tab
- Find `POST /api/license/claim-trial` request
- Check Status code:
  - `201` = Success! (but error parsing response?)
  - `400` = Bad request
  - `404` = Not found
  - `500` = Server error
  - `409` = Already has trial
- Click request → Response tab → copy the response
- Share this response for debugging

### Step 5: License Generation
- [ ] Console shows: `[API] Generating trial license key...`
- [ ] Console shows: `[API] Generated license key: VIBE-T...`
- [ ] Console shows: `[API] Storing license key in database...`
- [ ] Console shows: `[API] License key stored successfully`

**If error here:**
- Check Supabase database schema
- Verify `license_keys` table exists
- Check for database connection issues

### Step 6: Success
- [ ] Console shows: `[Flow] Trial license claimed successfully`
- [ ] Console shows: `[Session] License session cleared`
- [ ] Redirected to `/dashboard?trial=claimed`
- [ ] Dashboard loads successfully

**If redirect doesn't happen:**
- Check if router.push() is working
- Look for any console errors
- Check if Next.js navigation is blocked

## Verification

After successful completion, verify:

### In Browser
```javascript
// Should return null (session cleared after claim)
localStorage.getItem('viberyt_license_session')
```

### In Supabase Database
```sql
-- Should have one trial record
SELECT * FROM license_keys 
WHERE user_id = '<uuid>' 
AND key_type = 'trial';

-- Should have one profile record
SELECT * FROM user_profiles 
WHERE id = '<uuid>' 
AND subscription_type = 'trial';
```

### Network Request (last check)
- API returned status `201`
- Response showed success message
- No errors in response body

## Common Error Scenarios

### "JSON.parse: unexpected character..."
**Diagnosis:**
1. Network tab → `/api/license/claim-trial` → Response
2. Is it valid JSON? Or HTML?
3. What's the Status code?

**Solutions:**
- Status 500: Server error → check Next.js logs
- Status 404: Route not found → verify API file exists
- HTML response: API endpoint crashed → check error logs
- Empty response: API didn't respond → network issue

### "You already have an active trial"
**Diagnosis:**
- This is SUCCESS! ✓
- You've already claimed a trial
- Either wait 7 days or use different email

### "User not found"
**Diagnosis:**
1. Supabase Auth console → check users list
2. Is the user there?

**Solutions:**
- User not created: signup failed silently → check signup errors
- Service key wrong: check `.env.local` SUPABASE_SERVICE_ROLE_KEY
- Auth disabled: check Supabase Auth settings

### Session Storage Not Working
**Diagnosis:**
```javascript
// In console, manually check:
localStorage.setItem('test', 'value')
localStorage.getItem('test')  // Should return 'value'
```

**Solutions:**
- Private/Incognito mode: localStorage disabled
- Third-party cookies blocked: same issue
- Browser policy: check browser settings

### Stuck on Signup Form
**Diagnosis:**
1. Is form responsive?
2. Check console for errors
3. Check Network tab for requests

**Solutions:**
- Reload page and try again
- Clear browser cache
- Try different browser
- Check if Supabase is accessible

## Network Tab Inspection

When stuck, always check Network tab:

1. **Open DevTools → Network**
2. **Perform the action** (click button, submit form)
3. **Look for these requests:**
   - `POST /api/license/claim-trial` - Should see this
   - `POST /auth/signup` (to Supabase) - From signup form
4. **Check each request:**
   - Status code (201 = good, 4xx = client error, 5xx = server error)
   - Response body (click Response tab)
   - Response headers (check Content-Type: application/json)

### Example Good Response
```
Status: 201 Created
Content-Type: application/json
Body: {
  "success": true,
  "message": "Success! Check your email...",
  "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-YYYY"
}
```

### Example Bad Response
```
Status: 500 Internal Server Error
Content-Type: text/html
Body: <html><body>Internal Server Error...</body></html>
```
(This causes JSON parse error!)

## Still Stuck?

**Provide these details:**
1. Screenshot of console logs (scroll to see all)
2. Network request response body (all of it)
3. Steps you took to reproduce
4. What you expected vs what happened
5. Browser type and version

Then the system can be debugged properly!

---

**Pro Tip:** Save the console logs before closing the browser!
```javascript
// In console:
copy(document.body.innerText)
// Paste into text editor to save
```
