# License Key System Implementation

This document describes the complete license key generation, validation, and activation system for VibeRyt.

## Architecture Overview

### Components

1. **License Key Generator** (`src/lib/license-key-generator.ts`)
   - TypeScript port of the Python license generator
   - Generates secure, checksummed license keys
   - Validates license key format and checksum

2. **Database Layer** (`src/lib/license-db.ts`)
   - Supabase integration for storing/retrieving license data
   - User profile management
   - Trial status tracking

3. **API Endpoints**
   - `POST /api/auth/register` - Auto-generates trial key on signup
   - `POST /api/license/validate` - Validates license key from desktop app
   - `POST /api/license/activate` - Binds license to a device

## License Key Format

```
VIBE-T0007-XXXX-XXXX-XXXX-XXXX
      └─────────────────────────┘ Base key (56 chars)
           └──────────────────── Type (T=Trial, L=Lifetime, D=Demo) + Duration
```

### Example Keys

- Trial (7 days): `VIBE-T0007-AB12-CD34-EF56-IJKL`
- Lifetime: `VIBE-LLIFE-AB12-CD34-EF56-IJKL`
- Demo (5 recordings): `VIBE-D0005-AB12-CD34-EF56-IJKL`

### Checksum Validation

Each key has a 4-character checksum at the end that validates:
- Key hasn't been tampered with
- Type and duration haven't been modified
- Uses SHA256 hash of (key_without_checksum + secret_salt)

## Database Schema

### `user_profiles` table

```sql
-- Trial status tracking
subscription_type  -- 'none', 'trial', 'lifetime'
trial_activated_at -- When trial started
trial_ends_at      -- When trial expires
```

### `license_keys` table

```sql
user_id        -- Link to user_profiles
license_key    -- Unique license key
key_type       -- 'trial', 'lifetime', 'demo'
device_id      -- Device bound to (null if not activated)
is_activated   -- Whether license has been activated
activated_at   -- When first activated
expires_at     -- Expiration date (null for lifetime)
```

## API Endpoints

### 1. User Registration → Auto-Generate Trial Key

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "trial": {
    "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX",
    "daysValid": 7,
    "expiresAt": "2026-01-14T12:00:00Z"
  }
}
```

**What happens:**
1. Creates user in Supabase Auth
2. Creates user profile in `user_profiles` table
3. Generates 7-day trial license key
4. Stores key in `license_keys` table
5. Sets trial expiration (7 days from now)
6. Returns license key (should be emailed to user via Resend)

### 2. Validate License Key (Desktop App)

**Endpoint:** `POST /api/license/validate`

**Request:**
```json
{
  "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX",
  "deviceId": "device-uuid-or-mac-address"
}
```

**Response (200 - Valid):**
```json
{
  "success": true,
  "valid": true,
  "license": {
    "type": "trial",
    "isActivated": false,
    "daysRemaining": 7,
    "expiresAt": "2026-01-14T12:00:00Z"
  }
}
```

**Response (410 - Expired):**
```json
{
  "success": false,
  "valid": false,
  "error": "License has expired",
  "expiredAt": "2026-01-14T12:00:00Z"
}
```

**Response (403 - Wrong Device):**
```json
{
  "success": false,
  "valid": false,
  "error": "License is registered to a different device",
  "currentDevice": "device-uuid-old"
}
```

**Validations:**
- ✅ Checksum valid
- ✅ Key exists in database
- ✅ Device ID matches (if already bound)
- ✅ License not expired (for trials)
- ✅ Calculate days remaining

### 3. Activate License (Desktop App)

**Endpoint:** `POST /api/license/activate`

**Request:**
```json
{
  "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX",
  "deviceId": "device-uuid-or-mac-address"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "message": "License activated successfully",
  "activated": true,
  "device": "device-uuid"
}
```

**Response (409 - Already Bound to Different Device):**
```json
{
  "success": false,
  "error": "License is already activated on a different device",
  "currentDevice": "device-uuid-old"
}
```

**What happens:**
1. Validates license key format
2. Looks up key in database
3. Checks if already bound to a different device (prevents key sharing)
4. Binds key to this device
5. Sets `is_activated = true` and `activated_at = now`

## Usage Examples

### For Frontend (Signup)

```typescript
// User signs up
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();

if (data.success) {
  const licenseKey = data.trial.licenseKey;
  // TODO: Send to user via Resend email
  // TODO: Show in UI
}
```

### For Desktop App (Validation)

```typescript
// Validate license on app startup
const validate = async (licenseKey: string, deviceId: string) => {
  const response = await fetch('https://api.viberyt.com/api/license/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey, deviceId })
  });

  const data = await response.json();

  if (data.valid) {
    console.log(`License valid! Days remaining: ${data.license.daysRemaining}`);
    return true;
  } else {
    console.error(`License invalid: ${data.error}`);
    return false;
  }
};
```

### For Desktop App (Activation)

```typescript
// Activate when user enters license key for first time
const activate = async (licenseKey: string, deviceId: string) => {
  const response = await fetch('https://api.viberyt.com/api/license/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey, deviceId })
  });

  const data = await response.json();

  if (data.success) {
    console.log('License activated on this device');
    // Store licenseKey locally
    // Update app UI
  } else {
    console.error(`Activation failed: ${data.error}`);
  }
};
```

## Security Considerations

### ✅ What's Secure

1. **Checksummed keys** - Can't modify type/duration without invalidating key
2. **Device binding** - Prevents key sharing across devices
3. **One-time activation** - Can't re-activate same key on different device
4. **Server-side validation** - Not trusting client-provided data
5. **Expiration enforcement** - Trial licenses automatically expire

### ⚠️ Things to Add

1. **Rate limiting** - Prevent brute-force license checks
   ```typescript
   // Add to endpoints
   import { rateLimit } from '@/lib/rate-limit';
   
   await rateLimit(request, 10, '1m'); // 10 requests per minute
   ```

2. **Offline validation** - Desktop app can cache validation results
   ```typescript
   // Desktop app logic
   const cacheExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
   localStorage.setItem('licenseValidation', JSON.stringify({
     valid: true,
     expiresAt: licenseData.expiresAt,
     cachedAt: Date.now(),
     cacheExpiry
   }));
   ```

3. **License revocation** - Admin API to revoke stolen keys
   ```typescript
   // Future: Add to API
   POST /api/admin/license/revoke
   {
     licenseKey: string,
     reason: string
   }
   ```

4. **Key rotation** - Change secret salt periodically
   ```bash
   # Every 6-12 months:
   LICENSE_KEY_SECRET=new_random_string
   # Existing keys still validate (backward compatible)
   ```

## Environment Variables

Add to `.env.local`:

```bash
# License generation
LICENSE_KEY_SECRET=use_a_random_strong_string_here

# Supabase (for storing licenses)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## Testing

### Generate Sample Keys (Development)

```typescript
import { licenseGenerator } from '@/lib/license-key-generator';

// Generate trial key
const trial = licenseGenerator.generateTrialKey('Test User', 'test@example.com');
console.log(trial.licenseKey); // VIBE-T0007-XXXX-XXXX-XXXX-XXXX

// Generate lifetime key
const lifetime = licenseGenerator.generateLifetimeKey('Premium User', 'premium@example.com');
console.log(lifetime.licenseKey); // VIBE-LLIFE-XXXX-XXXX-XXXX-XXXX

// Validate
const { isValid, info } = licenseGenerator.validateLicenseKeyFormat(trial.licenseKey);
console.log(isValid); // true
```

### Test Endpoints

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Test validation
curl -X POST http://localhost:3000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX",
    "deviceId": "device-123"
  }'

# Test activation
curl -X POST http://localhost:3000/api/license/activate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "VIBE-T0007-XXXX-XXXX-XXXX-XXXX",
    "deviceId": "device-123"
  }'
```

## Next Steps

1. **Email Integration** - Hook up Resend to send license keys
   - Create email template
   - Send on registration (in `/api/auth/register`)
   - Send trial expiration reminder (cron job)

2. **Admin Panel** - Allow admins to:
   - View all licenses
   - Revoke stolen keys
   - Manually generate keys for support
   - Bulk generate keys for promotion

3. **Desktop App Integration** - Update desktop app to:
   - Call `/api/license/validate` on startup
   - Show license status in UI
   - Call `/api/license/activate` on first run
   - Handle expired trials (offer to purchase)

4. **Analytics** - Track:
   - How many users take trial
   - Trial-to-paid conversion rate
   - Device count per license
   - Key activation failures

5. **Payment Integration** - When user purchases:
   - Generate lifetime license key
   - Update `subscription_type = 'lifetime'`
   - Send new key via email
   - Optionally migrate from trial key
