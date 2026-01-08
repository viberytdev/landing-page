# License Key System - Frontend Integration Guide

## Overview
This guide explains how to integrate the updated license key system in frontend components. The system now provides clear authentication checks and duplicate prevention.

## Key Endpoints

### 1. Claim Free Trial (Authenticated Users Only)
**Endpoint**: `POST /api/license/claim-trial`

**Request**:
```typescript
const response = await fetch('/api/license/claim-trial', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    userId: currentUser.id  // Must be authenticated
  })
});

const data = await response.json();
```

**Response Success (201)**:
```json
{
  "success": true,
  "message": "Success! Check your email (user@example.com) for your trial license key.",
  "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-YYYY"  // Dev only
}
```

**Response Errors**:
- **400**: Invalid request - missing userId
- **401**: Not authenticated - user needs to sign in first
- **409**: Conflict - user already has trial or lifetime license
  ```json
  {
    "success": false,
    "error": "You already have an active trial license."
  }
  ```
- **500**: Server error

---

### 2. Generate Paid License
**Endpoint**: `POST /api/license/generate-paid`

**When to Call**: After successful payment processing

**Request**:
```typescript
const response = await fetch('/api/license/generate-paid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: currentUser.id,
    licenseType: 'lifetime',  // or 'demo'
    paymentId: 'payment-123'  // optional
  })
});
```

**Response Success (201)**:
```json
{
  "success": true,
  "message": "Lifetime license created successfully. Check your email for details.",
  "expiresAt": null  // null for lifetime, ISO string for demo
}
```

---

## Updated Component: Pricing Component Flow

### Current Issue
Users are redirected to signup without immediately claiming the trial. With the fix, you can:

### Improved Flow

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClaimTrial } from '@/hooks/useClaimTrial';
import { supabase } from '@/lib/supabase';

export default function Pricing() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { claimTrial } = useClaimTrial();

  const handleClaimTrial = async () => {
    setError('');
    setLoading(true);

    try {
      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Not logged in - redirect to signup
        router.push('/auth/signup?source=trial');
        setLoading(false);
        return;
      }

      // User is logged in - claim trial directly
      const result = await claimTrial(user.id);
      
      if (result.success) {
        // Show success message and redirect
        router.push('/dashboard?trial=claimed');
      } else {
        setError(result.error || 'Failed to claim trial');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaimTrial}
      disabled={loading}
      className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg..."
    >
      {loading ? 'Claiming...' : 'Claim Free Trial'}
    </button>
  );
}
```

---

## Updated Component: Signup Page Flow

### Current Implementation
The signup page already handles the `source=trial` parameter correctly. The system now:

1. Creates user account
2. Checks for `source=trial` in URL
3. Automatically claims trial after signup
4. Handles errors gracefully

```typescript
// In src/app/auth/signup/page.tsx (existing code - already working)

if (source === 'trial') {
  try {
    const claimResponse = await fetch('/api/license/claim-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: data.user.id }),
    });

    const claimData = await claimResponse.json();
    
    if (claimResponse.ok) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard?trial=claimed');
      }, 2000);
      return;
    }
  } catch (err) {
    console.error('Failed to claim trial:', err);
    // Fall through to normal flow
  }
}
```

---

## Hook: useClaimTrial

The existing hook now works better with improved error handling:

```typescript
export function useClaimTrial() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimTrial = useCallback(
    async (userId: string): Promise<ClaimTrialResponse> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/license/claim-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        const data: ClaimTrialResponse = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || 'Failed to claim trial';
          setError(errorMsg);
          return { success: false, message: '', error: errorMsg };
        }

        return {
          success: true,
          message: data.message,
          licenseKey: data.licenseKey,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return { success: false, message: '', error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { claimTrial, loading, error };
}
```

---

## Payment Flow Integration

### When Integrating with Payment Provider (Stripe, etc.)

1. **On Payment Success**:
```typescript
// In payment webhook or success handler
const response = await fetch('/api/license/generate-paid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: customer.userId,
    licenseType: 'lifetime',
    paymentId: charge.id
  })
});

if (response.ok) {
  // Send user confirmation email
  // Redirect to dashboard
}
```

2. **Server-Side Webhook Handler**:
```typescript
// Handle Stripe webhook
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  
  // Verify signature
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === 'charge.succeeded') {
    // Call license generation endpoint
    const licenseResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/license/generate-paid`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: event.data.object.metadata.userId,
          licenseType: 'lifetime',
          paymentId: event.data.object.id
        })
      }
    );
  }
}
```

---

## Error Handling Best Practices

### In Components:
```typescript
if (result.error) {
  if (result.error.includes('already have')) {
    // Show message about existing license
    showMessage('You already have a license');
  } else if (result.error.includes('not authenticated')) {
    // Redirect to login
    router.push('/auth/login');
  } else {
    // Show generic error
    showMessage(result.error);
  }
}
```

---

## Testing Scenarios

### Test Case 1: New User Claims Trial
```
1. User not logged in
2. Click "Claim Free Trial"
3. Redirected to /auth/signup?source=trial
4. User fills form, signs up
5. API automatically claims trial
6. Redirected to dashboard with success message
```

### Test Case 2: Logged-in User Claims Trial
```
1. User already logged in
2. Click "Claim Free Trial"
3. Trial claimed immediately
4. Redirected to dashboard
5. Trial message shown (TODO: implement)
```

### Test Case 3: User with Existing Trial
```
1. User tries to claim second trial
2. API returns 409 Conflict
3. Error shown: "You already have an active trial"
```

### Test Case 4: Trial Expired User
```
1. User's previous trial expired
2. User claims new trial
3. API allows second trial (old one expired)
4. New 7-day trial starts
```

### Test Case 5: Paid License User
```
1. User has lifetime license
2. User tries to claim trial
3. API returns 409 Conflict
4. Error shown: "You already have a lifetime license"
```

---

## Database Queries for Testing

### Check User's Licenses
```sql
SELECT id, license_key, key_type, expires_at, is_activated
FROM license_keys
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Check User Profile Subscription
```sql
SELECT id, subscription_type, trial_activated_at, trial_ends_at
FROM user_profiles
WHERE id = 'user-uuid';
```

### Find Active Trials
```sql
SELECT u.id, u.email, lk.license_key, lk.expires_at
FROM license_keys lk
JOIN auth.users u ON lk.user_id = u.id
WHERE lk.key_type = 'trial'
  AND lk.expires_at > NOW()
ORDER BY lk.created_at DESC;
```
