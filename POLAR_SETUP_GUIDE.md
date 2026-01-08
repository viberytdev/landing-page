# Polar.sh Payment Integration Setup

## Overview
This guide walks you through setting up Polar.sh for processing both license types. Your app has two license products in Polar:
1. **Free Trial** - $0 (7-day trial, processed via Polar.sh for consistency)
2. **Lifetime License** - $49 USD (one-time payment, processed via Polar.sh)

---

## Step 1: Create Polar Account & Product

### 1.1 Sign Up for Polar
1. Go to [polar.sh](https://polar.sh)
2. Click "Sign Up" and create your account
3. Verify your email
4. Complete your profile (organization name, description)

### 1.2 Create Your Products
You need to create TWO products in Polar:

#### Product 1: Free Trial
1. In Polar dashboard, go to **Products**
2. Click **"New Product"**
3. Fill in the details:
   - **Name**: `Viberyt Free Trial`
   - **Description**: `7-day free trial of Viberyt voice transcription. Full access to all features.`
   - **Price**: `0` USD
   - **Pricing Type**: `One-time`

#### Product 2: Lifetime License
1. Click **"New Product"** again
2. Fill in the details:
   - **Name**: `Viberyt Lifetime License`
   - **Description**: `Permanent access to Viberyt voice transcription with priority support`
   - **Price**: `49` USD
   - **Pricing Type**: `One-time`

### 1.3 Get Your Product IDs
- After creating both products, copy both **Product IDs** (you'll need these for your code)
- They will look like: `prod_xxxxx` or similar
- **Trial Product ID**: Keep this separate (e.g., `POLAR_TRIAL_PRODUCT_ID`)
- **Lifetime Product ID**: Keep this separate (e.g., `POLAR_LIFETIME_PRODUCT_ID`)

---

## Step 2: Get API Credentials

### 2.1 Create Organization Access Token
Instead of API keys, you can use **Organization Access Tokens**. This is actually preferred as it's more secure.

1. Go to **Settings → Integrations** in Polar dashboard
2. Click **"Create Access Token"**
3. Give it a name: `Viberyt Server`
4. Make sure these scopes are selected:
   - ✅ `checkouts:read` - Read checkout data
   - ✅ `checkouts:write` - Create checkouts
   - ✅ `webhooks:read` - Read webhook configuration
   - ✅ `webhooks:write` - Configure webhooks
   - ✅ `products:read` - Read products
   - ✅ `products:write` - Manage products (optional)
5. Copy the token (you won't see it again)

### 2.2 Get Webhook Signing Key
1. In **Settings → Webhooks**, you'll see a **Signing Key**
2. Copy this key (needed for verifying webhook authenticity)

---

## Step 3: Environment Variables

Add these to your `.env.local`:

```env
# Polar.sh Configuration
POLAR_ACCESS_TOKEN=your_organization_access_token_here
POLAR_TRIAL_PRODUCT_ID=prod_xxxxx_trial    # Free trial product
POLAR_LIFETIME_PRODUCT_ID=prod_xxxxx_paid  # $49 lifetime product
POLAR_WEBHOOK_SECRET=your_webhook_signing_key
POLAR_ORGANIZATION_ID=your_org_id          # Found in Polar settings

# Your App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change to production URL later
```

**Note**: The `POLAR_ACCESS_TOKEN` is your Organization Access Token from Step 2.1

---

## Step 4: Environment Setup

### 4.1 Update `.env.local`
```bash
# Polar Configuration - Testing
POLAR_ACCESS_TOKEN=your_test_org_access_token  # Organization Access Token
POLAR_TRIAL_PRODUCT_ID=prod_test_trial
POLAR_LIFETIME_PRODUCT_ID=prod_test_paid
POLAR_WEBHOOK_SECRET=whsec_test_xxxxx
POLAR_ORGANIZATION_ID=org_xxxxx
```

### 4.2 For Testing
- Use Polar's **Testing/Sandbox** mode
- Use test credit cards (provided by Polar docs)
- Free trial ($0) can be claimed without entering payment info
- Lifetime ($49) uses test card: `4111 1111 1111 1111`
- Your Organization Access Token will work for both testing and production

---

## Step 5: Implementation Files

You need these API routes:

### 5.1 `/app/api/payments/checkout.ts` - Create Checkout Link
Creates a checkout link for the lifetime license.

```typescript
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, licenseType = 'lifetime' } = body;

    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    // Call Polar API to create checkout
    const checkoutResponse = await fetch(
      'https://api.polar.sh/v1/checkouts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.POLAR_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: process.env.POLAR_PRODUCT_ID,
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success&userId=${userId}&licenseType=${licenseType}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
          customer_email_optional: false,
          metadata: {
            userId,
            licenseType,
          },
        }),
      }
    );

    if (!checkoutResponse.ok) {
      throw new Error('Failed to create Polar checkout');
    }

    const checkout = await checkoutResponse.json();

    return Response.json({
      checkoutUrl: checkout.checkout_url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
```

### 5.2 `/app/api/payments/webhook.ts` - Webhook Handler
Handles payment success from Polar.

```typescript
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify Polar webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.POLAR_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-polar-signature');
    if (!signature) {
      return Response.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const body = await req.text();
    
    // Verify signature
    if (!verifyWebhookSignature(body, signature)) {
      return Response.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const eventType = event.type;

    // Handle checkout completed
    if (eventType === 'checkout.completed') {
      const checkout = event.data;
      const metadata = checkout.metadata || {};
      const userId = metadata.userId;
      const licenseType = metadata.licenseType || 'lifetime';

      if (!userId) {
        return Response.json(
          { error: 'Missing userId in metadata' },
          { status: 400 }
        );
      }

      // Call your license generation endpoint
      const licenseResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/license/generate-paid`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            userId,
            licenseType,
            paymentId: checkout.id,
          }),
        }
      );

      if (!licenseResponse.ok) {
        throw new Error('Failed to generate license after payment');
      }

      console.log(`License generated for user ${userId} after payment`);
    }

    // Acknowledge receipt
    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Frontend Integration

### 6.1 Update Pricing Component
In `src/components/Pricing.tsx`, add button to initiate checkout:

```typescript
const handleBuyNow = async () => {
  if (!user?.id) {
    router.push('/auth/signup?plan=lifetime');
    return;
  }

  try {
    setLoading(true);
    const response = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        licenseType: 'lifetime',
      }),
    });

    const data = await response.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  } catch (error) {
    console.error('Checkout error:', error);
  }
};
```

### 6.2 Handle Success Redirect
In your dashboard, detect the `payment=success` query param and show success message.

---

## Step 7: Configure Webhook in Polar

1. Go to Polar Dashboard → **Settings → Webhooks**
2. Click **"Add Webhook Endpoint"**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/payments/webhook
   ```
   (For local testing, use a tunnel like ngrok: `https://your-ngrok-id.ngrok.io/api/payments/webhook`)

4. Select events to listen for:
   - ✅ `checkout.completed` (Payment successful)
   - ✅ `checkout.expired` (Optional)
   - ✅ `order.created` (Optional)

5. Click **"Save"**

---

## Step 8: Testing

### 8.1 Local Testing with ngrok
```bash
# In another terminal
ngrok http 3000

# Copy the ngrok URL: https://xxxx-xx-xxx-xxx-xx.ngrok.io
# Use this URL for NEXT_PUBLIC_APP_URL in .env.local
# Add webhook to Polar dashboard with: https://xxxx-xx-xxx-xxx-xx.ngrok.io/api/payments/webhook
```

### 8.2 Test Payment Flow
1. Go to pricing page
2. Click "Buy Now" on Lifetime License
3. You'll be redirected to Polar checkout
4. Use Polar's test card:
   - **Card**: `4111 1111 1111 1111`
   - **Expiry**: Any future date
   - **CVC**: Any 3 digits
5. Complete the checkout
6. Verify webhook was received and license was generated

### 8.3 Check Webhook Status
In Polar Dashboard → Webhooks → View your endpoint → Check delivery logs

---

## Step 9: Production Deployment

### 9.1 Update Environment Variables
```env
# Organization Access Token (same token works for testing and production)
POLAR_ACCESS_TOKEN=your_org_access_token

# Update your production domain
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 9.2 Update Webhook URL in Polar
```
https://yourdomain.com/api/payments/webhook
```

### 9.3 Verify Configuration
- [ ] Organization Access Token is set correctly
- [ ] Webhook URL uses production domain
- [ ] NEXT_PUBLIC_APP_URL is set to production URL
- [ ] Environment variables are set in production

---

## API Reference

### Polar Checkout API
```
POST https://api.polar.sh/v1/checkouts
Authorization: Bearer {POLAR_ACCESS_TOKEN}
```

**Request:**
```json
{
  "product_id": "prod_xxxxx",
  "success_url": "https://yourapp.com/success",
  "cancel_url": "https://yourapp.com/cancel",
  "metadata": {
    "userId": "user_123",
    "licenseType": "lifetime"
  }
}
```

**Response:**
```json
{
  "id": "checkout_xxxxx",
  "checkout_url": "https://checkout.polar.sh/...",
  "product_id": "prod_xxxxx",
  "status": "open"
}
```

### Webhook Events
**Event Type**: `checkout.completed`
```json
{
  "type": "checkout.completed",
  "data": {
    "id": "checkout_xxxxx",
    "metadata": {
      "userId": "user_123",
      "licenseType": "lifetime"
    }
  }
}
```

---

## Troubleshooting

### Webhook not received?
1. Check ngrok is running (local testing)
2. Verify webhook URL in Polar settings
3. Check Polar webhook delivery logs
4. Ensure signature verification is correct

### Payment not creating license?
1. Check `/api/license/generate-paid` endpoint logs
2. Verify userId is passed in metadata
3. Check Supabase service role key is correct
4. Verify user exists in your database

### Checkout creation fails?
1. Verify `POLAR_ACCESS_TOKEN` is correct and has proper scopes
2. Check `POLAR_TRIAL_PRODUCT_ID` and `POLAR_LIFETIME_PRODUCT_ID` match your actual products
3. Ensure `NEXT_PUBLIC_APP_URL` is set correctly
4. Verify Organization Access Token has `checkouts:write` scope

---

## Next Steps

1. Create Organization Access Token in Polar (Settings → Integrations)
2. Create `.env.local` with Polar credentials
3. Create two products in Polar (trial and lifetime)
4. Update Pricing component to call checkout API
5. Configure webhook in Polar dashboard
6. Test with ngrok (local) or staging environment
7. Deploy to production (token works for both testing and production)

---

## Files to Create/Update

- ✅ `/app/api/payments/checkout.ts` - NEW
- ✅ `/app/api/payments/webhook.ts` - NEW
- ✅ `src/components/Pricing.tsx` - UPDATE (add checkout button)
- ✅ `.env.local` - UPDATE (add Polar vars)

---

## Additional Resources
- [Polar.sh Documentation](https://docs.polar.sh)
- [Polar API Reference](https://docs.polar.sh/api)
- [Webhook Events](https://docs.polar.sh/webhooks)
- [Testing Guide](https://docs.polar.sh/testing)
