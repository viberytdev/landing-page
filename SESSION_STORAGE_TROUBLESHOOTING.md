# Session Storage System - Troubleshooting Guide

## Quick Diagnostics

### Step 1: Check Browser Console Logs
Open DevTools (F12 → Console) and look for logs starting with:
- `[Session]` - Session storage operations
- `[Flow]` - License claim flow operations
- `[Signup]` - Signup page operations

### Step 2: Check localStorage
Open DevTools (F12 → Application → Local Storage → Your Domain)

Look for:
```
Key: viberyt_license_session
Value: { "intent": "trial", "timestamp": ..., ... }
```

### Step 3: Check Network Requests
Open DevTools (F12 → Network) and look for:
- `POST /api/license/claim-trial` - Should see this after signup
- Check Response status: 201 = success, 409 = already has license, 401 = not authenticated

---

## Common Issues & Solutions

### Issue 1: User clicks "Claim Trial" but nothing happens

**Symptoms:**
- Button seems to work (disabled state changes)
- No redirect happens
- No errors shown

**Diagnosis:**
```typescript
// In console:
localStorage.getItem('viberyt_license_session')
// Should show the session object
```

**Solutions:**

1. **Check if user is authenticated:**
   ```typescript
   // In console:
   supabase.auth.getUser().then(data => console.log(data.data.user))
   ```
   - If `user` is null: User not logged in, should redirect to signup ✓
   - If `user` exists: Should claim directly, check network tab

2. **Check if localStorage is working:**
   ```typescript
   // In console:
   localStorage.setItem('test', 'value')
   localStorage.getItem('test')  // Should return 'value'
   ```
   - If returns null: localStorage disabled (private mode?)

3. **Check if component mounted properly:**
   - Reload page, try again
   - Check console for any React errors

---

### Issue 2: User signs up but trial is not claimed automatically

**Symptoms:**
- User account created successfully
- No automatic claim happens
- User redirected to /dashboard without trial

**Diagnosis Steps:**

1. **Check if session exists during signup:**
   ```typescript
   // Add to signup form after submit:
   console.log('Session:', localStorage.getItem('viberyt_license_session'))
   ```

2. **Check API response:**
   - Open DevTools → Network
   - Look for `POST /api/license/claim-trial`
   - Check Response tab:
     ```json
     {
       "success": true,
       "message": "Success! Check your email..."
     }
     ```

**Solutions:**

1. **Session not being set:**
   - Verify user clicked "Claim Trial" button (not just navigated to URL)
   - Check that session is set before redirect
   - Verify URL has `?source=trial` parameter

2. **API failing silently:**
   - Check Network tab for request details
   - Look for error in Response body
   - Common responses:
     - `409`: User already has trial → expected after first claim
     - `401`: User not authenticated → check Supabase auth
     - `500`: Server error → check server logs

3. **Session cleared too early:**
   - Check if session is being cleared unexpectedly
   - Verify session hasn't been cleared after 1 hour

---

### Issue 3: "Already have active trial" error

**Symptoms:**
- User gets error on second claim attempt
- Or error appears incorrectly on first attempt

**Diagnosis:**

```sql
-- Check database for active trials:
SELECT id, user_id, license_key, key_type, expires_at, created_at
FROM license_keys
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

**Solutions:**

1. **Expected behavior (user already claimed):**
   - Previous trial exists and not expired
   - This is correct! User cannot claim multiple trials
   - Solution: Wait for trial to expire OR create test user with different email

2. **Bug (false positive - no actual trial):**
   - Database shows no trials, but API says user has one
   - Issue may be in `hasActiveLicense()` function
   - Check database query is working correctly

3. **Cleanup (expired trial blocking new claim):**
   ```sql
   -- Find and remove expired trials (if needed):
   DELETE FROM license_keys
   WHERE key_type = 'trial'
   AND expires_at < NOW()
   AND user_id = 'user-uuid-here';
   ```

---

### Issue 4: Page redirects to signup but session is lost

**Symptoms:**
- User clicked "Claim Trial"
- Got redirected to signup
- Refreshed page or navigated away
- Session disappeared

**This is NOT a bug** - Scenarios:

1. **User refreshed signup page:**
   - Session should still be in localStorage ✓
   - Check: `localStorage.getItem('viberyt_license_session')`

2. **User opened link in new tab:**
   - New tab has its own localStorage
   - This is expected browser behavior
   - User needs to complete signup in same tab

3. **User waited >1 hour before signing up:**
   - Session auto-cleared as expired (1 hour timeout)
   - User needs to start over
   - This is expected behavior

---

### Issue 5: Error "No license intent in session"

**Symptoms:**
- Claim fails with this error
- User trying to claim without clicking button first

**Solution:**
- This shouldn't happen in normal flow
- Only happens if user manually navigates to signup with `?source=trial`
- Can be fixed by redirecting to pricing page to start flow

---

### Issue 6: Multiple tabs not syncing

**Symptoms:**
- User claims trial in Tab A
- Tab B still shows session as unclaimed
- Each tab has different session state

**This is expected behavior** - Browser isolation:
- Each tab has independent localStorage
- This is a security feature
- Not a bug unless we need sync (future enhancement)

---

## Debug Mode: Enable Extra Logging

Add this to component to see detailed logs:

```typescript
import { getSessionDebugInfo, getLicenseSession } from '@/lib/session-storage';

useEffect(() => {
  console.log('=== License Session Debug Info ===');
  console.log(getSessionDebugInfo());
}, []);
```

---

## Testing Workflows

### Test 1: Complete Trial Claim (Not Logged In)
```
1. Open pricing page
2. Open DevTools → Console
3. Click "Claim Free Trial"
4. Check console for [Flow] logs
5. Should redirect to signup
6. Check localStorage: should have session
7. Fill signup form
8. Check console for [Signup] logs
9. Should see [Flow] Trial license claimed successfully
10. Should redirect to /dashboard?trial=claimed
```

### Test 2: Direct Claim (Already Logged In)
```
1. Log in to app
2. Navigate to pricing page
3. Click "Claim Free Trial"
4. Check console for [Flow] logs
5. Should NOT redirect
6. Should see claim success immediately
7. Check Network: should see POST request
8. Should redirect to /dashboard?trial=claimed
```

### Test 3: Second Claim (Should Fail)
```
1. Complete Test 1 successfully
2. Log out
3. Log in again
4. Navigate to pricing
5. Click "Claim Free Trial"
6. Should show error: "already have an active trial"
7. Check Network: should see 409 response
```

### Test 4: Session Timeout
```
1. Click "Claim Free Trial"
2. Check session in localStorage
3. Wait 1 hour (or manually update timestamp)
4. Navigate to a new page
5. Check session in localStorage
6. Should be empty (auto-cleared)
```

---

## Performance Checks

### Session Storage Should Be <1KB
```typescript
// In console:
JSON.stringify(localStorage.getItem('viberyt_license_session')).length
// Should be <200 bytes
```

### No Memory Leaks
- Session is cleared after successful claim ✓
- Session is cleared after 1 hour ✓
- Each action properly clears previous state ✓

---

## Support Escalation

If issue persists after troubleshooting:

1. **Collect debug info:**
   ```typescript
   const debugInfo = {
     session: localStorage.getItem('viberyt_license_session'),
     userAgent: navigator.userAgent,
     timestamp: new Date().toISOString(),
     console_logs: '... copy from DevTools ...',
     network_requests: '... export from Network tab ...'
   };
   console.log(JSON.stringify(debugInfo, null, 2));
   ```

2. **Check server logs:**
   - Look at `/api/license/claim-trial` logs
   - Check Supabase database logs
   - Verify auth is working

3. **Create reproduction case:**
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/video if possible
