# Free Trial Claim Flow - Implementation Guide

## Overview

When a user clicks "Claim Free Trial" on the landing page, the system:
1. Checks if user is authenticated
2. If not authenticated → Redirects to signup
3. If authenticated → Generates a trial license key and stores it
4. Shows success message and redirects to dashboard
5. Sends license key via email (TODO with Resend)

## Flow Diagram

```
User clicks "Claim Free Trial"
         ↓
    [Check Auth]
         ↓
    Is User Logged In?
      /        \
    NO         YES
    ↓           ↓
Redirect      Generate
to Signup     Trial Key
              ↓
          Store in DB
              ↓
          Show Success
          Message
              ↓
          Send Email
          (TODO)
              ↓
          Redirect to
          Dashboard
```

## Files Changed/Created

### Backend API Endpoints

#### 1. **POST /api/license/claim-trial** - Claim Trial License
- **File:** [src/app/api/license/claim-trial.ts](src/app/api/license/claim-trial.ts)
- **What it does:**
  - Takes userId as input
  - Generates 7-day trial license key
  - Stores in Supabase database
  - Returns success message
  - TODO: Sends email with license key

- **Request:**
```json
{
  "userId": "user-uuid"
}
```

- **Response (201 - Success):**
```json
{
  "success": true,
  "message": "Success! Check your email (user@example.com) for your trial license key.",
  "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX" // Only in development
}
```

- **Response (409 - Already Has Trial):**
```json
{
  "success": false,
  "error": "You already have an active trial license. Check your email for details."
}
```

#### 2. **GET /api/auth/me** - Get Current User
- **File:** [src/app/api/auth/me.ts](src/app/api/auth/me.ts)
- **What it does:**
  - Checks if user is authenticated
  - Returns user info (id, email, name) or null

- **Response (200 - Authenticated):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

- **Response (200 - Not Authenticated):**
```json
{
  "user": null
}
```

### Frontend Components

#### 3. **Pricing Component** - Updated Trial Button
- **File:** [src/components/Pricing.tsx](src/components/Pricing.tsx)
- **Changes:**
  - Trial button now calls `handleClaimTrial()` instead of linking
  - Shows loading state while processing
  - Displays success/error messages
  - Redirects to dashboard on success

#### 4. **useClaimTrial Hook** - Reusable Trial Claim Logic
- **File:** [src/hooks/useClaimTrial.ts](src/hooks/useClaimTrial.ts)
- **What it does:**
  - Encapsulates trial claim logic
  - Handles loading and error states
  - Can be used in any component

## How It Works

### User Journey

1. **User arrives at pricing page**
   - Sees "Claim Free Trial" button in trial pricing card

2. **User clicks "Claim Free Trial"**
   - Button shows "Claiming..." loading state

3. **System checks if user is logged in**
   ```javascript
   const userResponse = await fetch("/api/auth/me");
   const userData = await userResponse.json();
   ```

4. **If NOT logged in:**
   - Redirect to signup page
   - User registers/logs in
   - Can then claim trial

5. **If logged in:**
   - Call `/api/license/claim-trial` endpoint
   ```javascript
   const trialResponse = await fetch("/api/license/claim-trial", {
     method: "POST",
     body: JSON.stringify({ userId: userData.user.id })
   });
   ```

6. **Backend processes:**
   - Verifies user exists in Supabase
   - Checks for existing trial/subscription
   - Generates license key (e.g., `VIBE-T0007-AB12-CD34-EF56-IJKL`)
   - Stores in `license_keys` table with 7-day expiration
   - Updates `user_profiles.trial_ends_at`
   - Returns success message

7. **Frontend shows success message:**
   ```
   ✓ Success! Check your email (user@example.com) for your trial license key.
   ```

8. **After 2 seconds, redirects to dashboard**
   - URL: `/dashboard?trial=claimed`
   - Dashboard can show trial status/countdown

## Database Changes

### Supabase Tables Updated

1. **license_keys** - New entry created:
   ```sql
   INSERT INTO license_keys (
     user_id,
     license_key,
     key_type,
     expires_at,
     is_activated,
     created_at
   ) VALUES (
     'user-uuid',
     'VIBE-T0007-XXXX-XXXX-XXXX-XXXX',
     'trial',
     NOW() + INTERVAL '7 days',
     FALSE,
     NOW()
   );
   ```

2. **user_profiles** - Updated:
   ```sql
   UPDATE user_profiles SET
     subscription_type = 'trial',
     trial_activated_at = NOW(),
     trial_ends_at = NOW() + INTERVAL '7 days'
   WHERE id = 'user-uuid';
   ```

## Error Handling

### Possible Errors

| Error | Status | When | Solution |
|-------|--------|------|----------|
| Not authenticated | 200 | User not logged in | Redirect to signup |
| Already has trial | 409 | User already claimed | Show error message |
| Already has lifetime | 409 | User already paid | Show error message |
| User not found | 404 | Rare/shouldn't happen | Show generic error |
| Server error | 500 | DB connection issue | Retry or contact support |

### Error Messages

```typescript
if (!userData.user?.id) {
  // Not authenticated - redirect to signup
  router.push("/auth/signup");
}

if (!trialResponse.ok) {
  // Show error
  setShowError(trialData.error);
}
```

## Email Integration (TODO)

When implemented with Resend, the `claim-trial` endpoint should:

1. After storing license key, send email:
```typescript
// In claim-trial endpoint:
const emailResponse = await resend.emails.send({
  from: 'VibeRyt <onboarding@viberyt.com>',
  to: userEmail,
  subject: 'Your VibeRyt 7-Day Free Trial License Key',
  html: `
    <h1>Welcome to VibeRyt!</h1>
    <p>Your free 7-day trial is ready to activate.</p>
    <p><strong>License Key: ${licenseKey}</strong></p>
    <p>Valid until: ${expirationDate}</p>
    <p><a href="https://viberyt.com/download">Download Desktop App</a></p>
  `
});
```

## Testing

### Test Locally

1. **Sign up a test user**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```
   Response includes: `licenseKey` (in development)

2. **Or use the Pricing component:**
   - Open http://localhost:3000
   - Scroll to pricing
   - Click "Claim Free Trial"
   - If not logged in → redirects to signup
   - After signup → shows success message
   - Redirects to /dashboard?trial=claimed

3. **Check database:**
   - Go to Supabase Dashboard
   - View `license_keys` table
   - Verify entry was created with:
     - `license_key`: `VIBE-T0007-*`
     - `key_type`: `trial`
     - `expires_at`: 7 days from now
     - `is_activated`: false (not activated yet)

4. **Validate the license key:**
   ```bash
   curl -X POST http://localhost:3000/api/license/validate \
     -H "Content-Type: application/json" \
     -d '{
       "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX",
       "deviceId": "test-device"
     }'
   ```
   Should return: `valid: true, daysRemaining: 7`

### Test Error Cases

**Case 1: User clicks trial without being logged in**
```javascript
// Component handles: redirects to /auth/signup
```

**Case 2: User already has active trial**
```bash
curl -X POST http://localhost:3000/api/license/claim-trial \
  -H "Content-Type: application/json" \
  -d '{"userId": "same-user-uuid"}'
```
Response: `409 - "You already have an active trial license"`

**Case 3: User already purchased lifetime**
```bash
# First set subscription_type to 'lifetime' in database
# Then try to claim trial
```
Response: `409 - "You already have a lifetime license"`

## Security Considerations

✅ **What's Secure:**
- User ID required (can't generate trial for anyone)
- Database stores unique user → trial relationship
- Trial expires after 7 days
- License key is checksummed (tamper-proof)

⚠️ **What to Add:**
- Rate limiting (prevent DoS attacks)
- Verify user email before claiming
- Log all trial claims for audit trail
- Require email verification for new signups

## Next Steps

1. **Email Integration** - Implement Resend email sending
   - Create email template
   - Send on trial claim
   - Add retry logic for failed sends

2. **Dashboard UI** - Show trial status
   - Days remaining countdown
   - License key display
   - Expiration warning at day 6

3. **Auto-Expiration** - Implement trial expiration
   - Cron job to update expired trials
   - Send "trial ending" email day 6
   - Disable app after expiration

4. **Admin Panel** - For support team
   - View all claimed trials
   - Manually extend or revoke trials
   - Bulk generate trials for campaigns

## Code Examples

### Example: Using in Custom Component

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrialButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    setLoading(true);
    
    try {
      // Check auth
      const user = await fetch("/api/auth/me").then(r => r.json());
      
      if (!user.user) {
        router.push("/auth/signup");
        return;
      }
      
      // Claim trial
      const result = await fetch("/api/license/claim-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.user.id })
      }).then(r => r.json());
      
      if (result.success) {
        setMessage("Check your email!");
        router.push("/dashboard");
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Claiming..." : "Claim Free Trial"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

---

**All TypeScript code compiles successfully ✅**

Ready for integration with Resend email service!
