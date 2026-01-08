# Session Storage System - Quick Start

## What Changed

The license claim system now uses **session storage** to track user intent across signup.

### Before ❌
```
User clicks "Claim Trial"
  ↓
Redirected to signup
  ↓
System forgets they wanted a trial
  ↓
No automatic claim after signup
```

### After ✅
```
User clicks "Claim Trial"
  ↓
Intent saved to localStorage
  ↓
Redirected to signup (session intact)
  ↓
Account created
  ↓
Trial claimed automatically
  ↓
User redirected to dashboard with trial
```

## Files Changed

### New Files
- `src/lib/session-storage.ts` - Session management
- `src/hooks/useLicenseFlow.ts` - Flow management hook

### Modified Files
- `src/components/Pricing.tsx` - Uses new hook
- `src/app/auth/signup/page.tsx` - Auto-claims after signup

## How to Test

### Test 1: Complete Flow (Not Logged In)
1. Open app (logged out)
2. Scroll to pricing section
3. Click "Claim Free Trial"
4. Fill signup form with:
   - Email: test@example.com
   - Password: test123test
5. Click "Create Account"
6. **Expected**: Automatically redirected to dashboard with trial claimed
7. **Check**: URL should show `/dashboard?trial=claimed`

### Test 2: Already Logged In
1. Log in to app
2. Scroll to pricing
3. Click "Claim Free Trial"
4. **Expected**: Immediately redirected to dashboard with trial claimed
5. **Check**: No signup form, direct redirect

### Test 3: Second Claim (Should Fail)
1. Complete Test 1
2. Log out and log back in
3. Scroll to pricing
4. Click "Claim Free Trial"
5. **Expected**: See error "You already have an active trial license"

## Debug

### Check Session in Browser
```javascript
// Open DevTools Console and run:
localStorage.getItem('viberyt_license_session')
```

Should see something like:
```json
{
  "intent": "trial",
  "timestamp": 1704676800000,
  "claimAttempted": false,
  "claimSuccessful": false
}
```

### Watch Console Logs
Open DevTools → Console, then perform test steps. Look for logs like:
```
[Session] License intent set to: trial
[Flow] User not authenticated, setting intent and redirecting to signup
[Signup] User created: user-uuid
[Signup] Attempting to claim trial license
[Flow] Trial license claimed successfully
[Session] License session cleared
```

### Check Network Request
Open DevTools → Network tab, look for:
- `POST /api/license/claim-trial` request
- Response status should be `201` (success) or `409` (already has)
- Response body shows success message

## Common Checks

### Issue: Nothing happens when clicking button
**Check:**
```javascript
// In console, verify hook works:
const session = localStorage.getItem('viberyt_license_session');
console.log('Session:', session);
console.log('Has intent:', session !== null);
```

**Fix:** Reload page, try again

### Issue: Claim doesn't auto-complete after signup
**Check:** 
- Watch console for `[Signup]` logs
- Check Network tab for API request
- Verify `?source=trial` is in signup URL

**Fix:** Check `SESSION_STORAGE_TROUBLESHOOTING.md`

### Issue: Getting "already have trial" incorrectly
**Check database:**
```sql
SELECT * FROM license_keys 
WHERE user_id = 'YOUR_USER_ID'
AND key_type = 'trial'
AND expires_at > NOW();
```

If results: trial exists and is active (expected)
If no results but error: might be cached, try different email

## System Requirements

✅ Modern browser with localStorage support
✅ JavaScript enabled
✅ Supabase auth working
✅ `/api/license/claim-trial` endpoint accessible

## Troubleshooting Reference

See `SESSION_STORAGE_TROUBLESHOOTING.md` for:
- Detailed diagnostics
- Common issues
- Solutions
- Debug techniques

## Flow Overview

```
Click Button
    ↓
Set Intent: setLicenseIntent('trial')
    ↓
Is User Logged In?
    ├─ YES → Claim immediately
    │        ├─ Success → /dashboard?trial=claimed
    │        └─ Error → Show error message
    │
    └─ NO → Redirect to signup
            ├─ User submits form
            ├─ Account created
            ├─ Check session for intent
            ├─ Claim automatically
            └─ Redirect to /dashboard?trial=claimed
```

## API Integration

No API changes needed! Session management is entirely client-side.

Existing endpoint `POST /api/license/claim-trial` works as before:
- Takes userId
- Creates trial key
- Stores in database
- Returns success/error

Session system just **automates when to call it**.

## Success Indicators

After implementing:
- [ ] Pricing component shows new button behavior
- [ ] Clicking "Claim Trial" when logged out redirects to signup
- [ ] Clicking "Claim Trial" when logged in claims immediately
- [ ] After signup with `?source=trial`, trial is auto-claimed
- [ ] User redirected to `/dashboard?trial=claimed`
- [ ] Console shows flow logs
- [ ] No TypeScript errors
- [ ] LocalStorage has session during flow
- [ ] Session clears after successful claim

## Need Help?

1. **Quick issues**: Check console logs for `[Flow]` messages
2. **Flow issues**: Read `SESSION_STORAGE_SYSTEM.md`
3. **Debug issues**: Read `SESSION_STORAGE_TROUBLESHOOTING.md`
4. **API issues**: Check `/api/license/claim-trial` endpoint
5. **Database issues**: Query `license_keys` table

---

**Ready to test!** 🚀
