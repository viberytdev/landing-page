# License Key Session Storage System - Implementation Guide

## Overview

The session storage system tracks user intent throughout the license claim flow. When a user clicks "Claim Free Trial", their intent is saved in localStorage and persists across page navigations and signup.

## Architecture

### Components

1. **Session Storage** (`src/lib/session-storage.ts`)
   - Manages localStorage for license claim intent
   - Tracks claim state and timestamps
   - Auto-clears old sessions (>1 hour)

2. **License Flow Hook** (`src/hooks/useLicenseFlow.ts`)
   - Manages complete license claim workflow
   - Handles auth checks and API calls
   - Provides retry logic

3. **Pricing Component** (`src/components/Pricing.tsx`)
   - Entry point for trial claim
   - Uses `useLicenseFlow` hook
   - Checks auth and redirects appropriately

4. **Signup Page** (`src/app/auth/signup/page.tsx`)
   - Completes license claim after signup
   - Checks session for pending claim
   - Automatically claims trial if in flow

## Flow Diagram

```
User clicks "Claim Free Trial"
    ↓
startTrialFlow() called
    ↓
Is user authenticated?
    ├─ YES → claimTrialLicense(userId) directly
    │         └─ Success? → Redirect to /dashboard?trial=claimed
    │         └─ Error? → Show error message
    │
    └─ NO → setLicenseIntent('trial')
            └─ Redirect to /auth/signup?source=trial
                ↓
            User fills signup form
                ↓
            Account created in Supabase
                ↓
            handleSubmit() checks getLicenseSession()
                ↓
            claimTrialAfterSignup(userId) called
                ↓
            claimTrialLicense(userId)
                ├─ Success → Clear session, redirect to /dashboard?trial=claimed
                └─ Error → Show error, continue to dashboard
```

## Session Storage API

### `getLicenseSession(): LicenseClaimSession`
Returns the current license session from localStorage.

```typescript
const session = getLicenseSession();
// {
//   intent: 'trial' | 'lifetime' | null,
//   timestamp: number,
//   claimAttempted: boolean,
//   claimSuccessful: boolean
// }
```

### `setLicenseIntent(intent: 'trial' | 'lifetime'): void`
Called when user clicks "Claim Trial" to set their intent.

```typescript
setLicenseIntent('trial');
// Stores in localStorage with current timestamp
```

### `markClaimAttempted(): void`
Called when license claim API is invoked.

```typescript
markClaimAttempted();
// Sets claimAttempted to true
```

### `markClaimSuccessful(): void`
Called when license claim API succeeds.

```typescript
markClaimSuccessful();
// Sets claimSuccessful to true
```

### `clearLicenseSession(): void`
Called when claim completes successfully or times out.

```typescript
clearLicenseSession();
// Removes from localStorage
```

### `isInLicenseFlow(): boolean`
Checks if user is actively in the license claim flow.

```typescript
if (isInLicenseFlow()) {
  // User has unfinished claim intent
}
```

## License Flow Hook API

### `useLicenseFlow()`
Main hook for managing license claims.

```typescript
const {
  startTrialFlow,           // Call when user clicks button
  claimTrialAfterSignup,    // Call in signup form after account creation
  claimTrialLicense,        // Direct API call
  checkAndClaimPendingLicense, // Call on page load to check for pending claims
  loading,                  // Is API call in progress?
  error,                    // Error message if any
  success,                  // Was claim successful?
  clearError,               // Clear error state
} = useLicenseFlow();
```

### Example: Using in Pricing Component

```typescript
const { startTrialFlow, loading, error } = useLicenseFlow();

const handleClaimTrial = async () => {
  await startTrialFlow();
  // If auth: claims immediately
  // If not auth: sets intent and redirects to signup
};

<button onClick={handleClaimTrial} disabled={loading}>
  {loading ? 'Claiming...' : 'Claim Free Trial'}
</button>
```

### Example: Using in Signup Page

```typescript
const { claimTrialAfterSignup } = useLicenseFlow();

if (data.user) {
  const session = getLicenseSession();
  if (session.intent === 'trial') {
    const result = await claimTrialAfterSignup(data.user.id);
    if (result.success) {
      router.push('/dashboard?trial=claimed');
    }
  }
}
```

## Session Storage Data Structure

### localStorage Key
```
viberyt_license_session
```

### Value
```json
{
  "intent": "trial",
  "timestamp": 1704676800000,
  "claimAttempted": false,
  "claimSuccessful": false
}
```

### Field Meanings
- **intent**: What type of license user is trying to claim ('trial', 'lifetime', or null)
- **timestamp**: When the intent was set (milliseconds since epoch)
- **claimAttempted**: Has the API been called?
- **claimSuccessful**: Did the API succeed?

## Session Lifecycle

### Step 1: User Clicks "Claim Trial"
```
localStorage: empty
↓
user clicks button
↓
setLicenseIntent('trial')
↓
localStorage: { intent: 'trial', timestamp: now, ... }
```

### Step 2: User Redirected to Signup (if not auth)
```
localStorage: { intent: 'trial', ... }
↓
redirect to /auth/signup?source=trial
↓
localStorage: still { intent: 'trial', ... }  ← preserved!
```

### Step 3: User Signs Up
```
localStorage: { intent: 'trial', ... }
↓
form submitted
↓
account created
↓
markClaimAttempted()
↓
localStorage: { intent: 'trial', claimAttempted: true, ... }
```

### Step 4: License Claimed
```
localStorage: { intent: 'trial', claimAttempted: true, ... }
↓
API call succeeds
↓
markClaimSuccessful()
↓
clearLicenseSession()
↓
localStorage: empty
```

## Error Handling

### Scenario 1: User Already Has Trial
```
startTrialFlow()
  → claimTrialLicense()
  → API returns 409 (conflict)
  → error state set: "You already have an active trial license"
  → session NOT cleared (user can retry)
```

### Scenario 2: API Timeout During Signup
```
handleSubmit()
  → account created
  → claimTrialAfterSignup() times out
  → error shown to user
  → session still marked as 'attempted'
  → user can manually retry on dashboard
```

### Scenario 3: User Abandons Signup
```
User clicks "Claim Trial"
  → setLicenseIntent('trial')
  → redirected to signup
  → user closes tab
  → session persists in localStorage
↓
User comes back after 1 hour
  → getLicenseSession() returns old session
  → old session (>1 hour) detected
  → clearLicenseSession() called automatically
  → session cleared
```

## Debugging

### Check Current Session
```typescript
// In browser console
localStorage.getItem('viberyt_license_session')
```

### Get Session Info
```typescript
import { getSessionDebugInfo } from '@/lib/session-storage';

console.log(getSessionDebugInfo());
// Output:
// Intent: trial
// Timestamp: 2025-01-07T20:00:00.000Z
// Claim Attempted: false
// Claim Successful: false
// In Flow: true
```

### Enable Debug Logging
The implementation already logs to console with `[Session]` and `[Flow]` prefixes. Open browser DevTools Console to see:

```
[Session] License intent set to: trial
[Flow] User not authenticated, setting intent and redirecting to signup
[Signup] User created: user-uuid-123
[Signup] Session intent: trial
[Signup] Attempting to claim trial license
[Flow] Trial license claimed successfully
[Session] License session cleared
```

## Testing Checklist

- [ ] User clicks "Claim Trial" while logged out
- [ ] Session is stored in localStorage
- [ ] User is redirected to `/auth/signup?source=trial`
- [ ] Session persists across redirect
- [ ] User fills form and submits
- [ ] Trial is automatically claimed after signup
- [ ] User redirected to `/dashboard?trial=claimed`
- [ ] Session is cleared after successful claim
- [ ] Error message shown if claim fails
- [ ] User can retry claim from dashboard
- [ ] Logged-in user can claim directly (no signup)
- [ ] Old sessions (>1 hour) are auto-cleared
- [ ] Multiple browsers have separate sessions
- [ ] Private/Incognito mode doesn't access other sessions

## Common Issues & Solutions

### Issue: Claim not completing after signup
**Solution**: Check browser console for `[Flow]` logs. Verify:
1. Session is being set: `localStorage.getItem('viberyt_license_session')`
2. API endpoint `/api/license/claim-trial` is accessible
3. User ID is correctly passed to API

### Issue: "Already have trial" error when they don't
**Solution**: Check database:
```sql
SELECT * FROM license_keys 
WHERE user_id = 'user-uuid' 
AND key_type = 'trial' 
AND expires_at > NOW();
```
May have expired trial that hasn't been cleaned up.

### Issue: Session lost when user refreshes
**Solution**: This is expected - localStorage is per-domain/browser. If user:
1. Clicks claim
2. Gets redirected to signup
3. Refreshes page
Session is preserved in localStorage (checked before redirect).

If user:
1. Clicks claim
2. Gets redirected to signup
3. Closes browser
4. Reopens browser after >1 hour
Session is auto-cleared as expired.

## Future Enhancements

- [ ] Add analytics events when session created/cleared
- [ ] Add persistent login across tabs
- [ ] Add retry logic if API temporarily fails
- [ ] Add popup notification for claim status
- [ ] Add session sync across tabs (BroadcastChannel API)
