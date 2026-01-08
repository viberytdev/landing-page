# Viberyt Setup Guide

This guide walks you through setting up all required services for the Viberyt landing page.

## Overview

You'll need to set up 3 external services:
1. **Supabase** - Database and authentication
2. **Resend** - Email service
3. **Polar.sh** - Payment processing

Total setup time: ~1-2 hours

---

## 1. Supabase Setup (Database & Auth)

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - Organization: Create or select existing
   - Project name: `viberyt`
   - Database password: Use a strong password (save this!)
   - Region: Choose closest to your users
4. Click "Create new project" and wait 2-3 minutes

### Get API Credentials

1. Once project loads, go to **Settings → API**
2. Under "Project API keys", copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### Create Database Tables

After setting up environment variables, run these SQL commands in Supabase SQL Editor:

```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  subscription_type TEXT CHECK (subscription_type IN ('none', 'lifetime')) DEFAULT 'none',
  trial_activated_at TIMESTAMP,
  trial_ends_at TIMESTAMP
);

-- License keys table
CREATE TABLE license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  license_key TEXT UNIQUE NOT NULL,
  device_id TEXT,
  is_activated BOOLEAN DEFAULT FALSE,
  activated_at TIMESTAMP,
  key_type TEXT CHECK (key_type IN ('trial', 'lifetime')),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment records
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  order_id TEXT UNIQUE,
  amount DECIMAL(10, 2),
  product_type TEXT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

---

## 2. Resend Setup (Email Service)

### Create Account

1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. You'll get a test API key immediately (starts with `re_`)

### Get API Key

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Copy your default API key → `RESEND_API_KEY`

### For Production: Verify Domain (Optional)

If you have a custom domain:

1. In Resend, go to **Domains**
2. Click "Add Domain"
3. Enter your domain (e.g., `mail.yourdomain.com`)
4. Add DNS records that Resend provides
5. Wait for verification (5-30 minutes)

For now, you can use the test API key for development.

---

## 3. Polar.sh Setup (Payments)

### Create Account & Organization

1. Go to [polar.sh](https://polar.sh)
2. Sign up and create account
3. Create or select organization
4. In settings, add bank account for payouts (Settings → Payouts)

### Create Products

Create 2 products for your pricing:

**Product 1: Free Trial**
1. Go to **Products → New Product**
2. Fill in:
   - Name: `Free Trial (7 days)`
   - Price: `$0`
   - Description: `7-day free trial of Viberyt`
   - Billing: One-time (not subscription)
3. Save and copy the **Product ID** → `POLAR_FREE_TRIAL_PRODUCT_ID`

**Product 2: Lifetime License**
1. Go to **Products → New Product**
2. Fill in:
   - Name: `Lifetime License`
   - Price: `$49`
   - Description: `Lifetime access to Viberyt`
   - Billing: One-time
3. Save and copy the **Product ID** → `POLAR_LIFETIME_PRODUCT_ID`

### Get API Key

1. Go to **Settings → API Keys**
2. Click "New API Key"
3. Copy the key → `NEXT_PUBLIC_POLAR_API_KEY`

### Setup Webhook

1. Go to **Settings → Webhooks**
2. Click "New Endpoint"
3. URL: `https://yourdomain.com/api/payments/webhook`
   - For testing: Use ngrok to create a tunnel, or deploy first
4. Events to subscribe to:
   - `order.created`
   - `order.updated`
5. Save and copy the **Signing Secret** → `POLAR_WEBHOOK_SECRET`

---

## 4. Environment Variables

Copy your credentials to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Resend
RESEND_API_KEY=re_your_key_here

# Polar.sh
NEXT_PUBLIC_POLAR_API_KEY=your_key_here
POLAR_WEBHOOK_SECRET=your_secret_here
POLAR_FREE_TRIAL_PRODUCT_ID=prod_...
POLAR_LIFETIME_PRODUCT_ID=prod_...

# License Key (use a strong random string)
LICENSE_KEY_SECRET=use_a_random_strong_string_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DESKTOP_APP_VERSION=1.0.0
```

---

## 5. Desktop App Download Server (Exe Distribution)

### Overview

You'll run a simple HTTP server on port 3001 to serve your desktop app executable for download at `http://localhost:3001/downloads/app.exe`.

### Setup Steps

#### Step 1: Create Download Directory Structure

```bash
# From your project root
mkdir -p downloads
```

#### Step 2: Place Your Executable

Copy or move your desktop app executable (built with your build system - could be from Tauri, Electron, .NET, etc.) to:

```
your-project/
├── downloads/
│   └── app.exe
├── package.json
├── ...
```

#### Step 3: Create a Simple Server File

Create a new file `download-server.js` in your project root:

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

const server = http.createServer((req, res) => {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route for downloading app.exe
  if (req.url === '/downloads/app.exe' && req.method === 'GET') {
    const filePath = path.join(DOWNLOADS_DIR, 'app.exe');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    // Set headers for file download
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="app.exe"');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File streaming error:', err);
      res.writeHead(500);
      res.end('Server error');
    });
    return;
  }

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`📥 Download server running at http://localhost:${PORT}`);
  console.log(`🔗 Download app.exe at: http://localhost:${PORT}/downloads/app.exe`);
});
```

#### Step 4: Add Package Scripts

Edit your `package.json` to add a download server script:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "download-server": "node download-server.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run download-server\"",
    ...
  }
}
```

#### Step 5: Install Concurrently (Optional)

If you want to run both the Next.js dev server and download server simultaneously:

```bash
npm install --save-dev concurrently
```

### Running the Download Server

**Option 1: Run Download Server Only**
```bash
npm run download-server
```

Then visit: `http://localhost:3001/downloads/app.exe`

**Option 2: Run Both Servers (Next.js + Download Server)**
```bash
npm run dev:all
```

- Next.js runs on `http://localhost:3000`
- Download server runs on `http://localhost:3001`

### For Production Deployment

Instead of a simple Node.js server, you have several options:

#### Option A: Use Vercel Rewrites (Recommended)

Update `next.config.ts` to rewrite download requests:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/downloads/app.exe',
          destination: '/api/download',
        },
      ],
    };
  },
};

export default nextConfig;
```

Then create `src/app/api/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), 'downloads', 'app.exe');
    
    // Read the file
    const file = await fs.readFile(filePath);
    
    // Return as download
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="app.exe"',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
```

#### Option B: AWS S3 / Cloudflare

1. Upload `app.exe` to S3 or Cloudflare R2
2. Update your download endpoint to redirect/proxy to the storage URL
3. Enables faster downloads and saves bandwidth

#### Option C: GitHub Releases

1. Upload app.exe to GitHub releases
2. Redirect to GitHub download URL
3. Create API endpoint that returns latest release URL

### Security Considerations

- **Rate limiting**: Add rate limiting for download endpoint to prevent abuse
- **Authentication**: Consider requiring login before download (optional)
- **Versioning**: Track which version users are downloading
- **Quarantine**: New exe files should be tested before deployment
- **Signing**: Sign your exe with a code certificate for Windows trust
- **Updates**: Implement auto-update mechanism to check for new versions

### Testing

Test your download locally:

```bash
# Start download server
npm run download-server

# In another terminal, test the endpoint
curl -I http://localhost:3001/downloads/app.exe

# Or test in browser
# Open http://localhost:3001/downloads/app.exe
```

---

## 6. Test Everything

### Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and check:

- ✅ Landing page loads
- ✅ Navigation links work
- ✅ Pricing cards display correctly
- ✅ FAQ accordion works
- ✅ Responsive design on mobile
- ✅ Sign up form appears
- ✅ Login form appears

### Test Sign Up Flow (Supabase)

Once Supabase is configured:
1. Click "Sign Up"
2. Enter test email and password
3. Should create account in Supabase
4. Check Supabase dashboard → Authentication → Users

### Test Email (Resend)

Once Resend is configured:
1. Update auth endpoint to use Resend
2. Sign up with email
3. Check inbox for welcome email
4. (May go to spam folder)

### Test Payment (Polar)

Once Polar is configured:
1. Click "Buy Lifetime License"
2. Should redirect to Polar checkout
3. Complete test payment with test card: `4242 4242 4242 4242`
4. Should be redirected back to your site
5. Check Polar dashboard for order

---

## 6. Deployment to Vercel

### Deploy Frontend

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in Vercel:
   - Add all values from `.env.local`
   - These become available to your app
6. Click "Deploy"

### Update Webhook URL

After deploying to Vercel:
1. Go to Polar.sh → Settings → Webhooks
2. Update webhook endpoint URL to: `https://yourdomain.vercel.app/api/payments/webhook`
3. Update `NEXT_PUBLIC_APP_URL` to your production URL

### Custom Domain (Optional)

In Vercel dashboard:
1. Go to project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Vercel will manage HTTPS certificate

---

## Troubleshooting

### "Cannot connect to Supabase"
- Check URL and API keys in `.env.local`
- Verify keys match Supabase dashboard
- Ensure `.env.local` is not in git (it shouldn't be)

### "Email not sending"
- Check Resend API key is correct
- Verify email format is valid
- Check spam folder
- For custom domain: verify DNS records are correct

### "Payment webhook not firing"
- Verify webhook URL is publicly accessible (not localhost)
- Check webhook signing secret matches
- Test with Polar's test events
- Check for CORS issues

### "License key not validating"
- Ensure license generation code is integrated
- Verify device ID is being captured correctly
- Check license key format matches expectations

---

## Next Steps

After setup:

1. Integrate your **license key generation code** into `/src/app/api/auth/register.ts`
2. Create email templates for:
   - Welcome email with license key
   - Trial ending reminder
   - Subscription confirmation
3. Update **testimonials** with real user quotes (if available)
4. Replace **hero image placeholder** with actual screenshot/video
5. Update contact email from `support@viberyt.com` to your email
6. Create **Privacy Policy** and **Terms of Service** pages
7. Set up **blog** section (optional)

---

## Support

If you get stuck:
- Check service documentation (Supabase, Resend, Polar.sh)
- Review integration point comments in code
- Test with curl or Postman
- Enable debug logging in development

