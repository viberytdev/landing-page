/**
 * POST /api/payments/webhook
 * Handles Polar.sh webhook events for payment processing
 *
 * Verifies signature and processes checkout.completed events
 * Triggers license generation on successful payment
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase configuration missing');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

/**
 * Verify the webhook signature matches Polar's signing key
 */
function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('POLAR_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return hash === signature;
}

export async function POST(req: Request) {
  try {
    // Get signature from headers
    const signature = req.headers.get('x-polar-signature');
    if (!signature) {
      console.warn('Webhook received without signature');
      return Response.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();

    // Verify signature
    if (!verifyWebhookSignature(body, signature)) {
      console.warn('Webhook signature verification failed');
      return Response.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the event
    const event = JSON.parse(body);
    const eventType = event.type;

    console.log(`Processing Polar webhook event: ${eventType}`);

    // Handle checkout completed
    if (eventType === 'checkout.completed') {
      const checkout = event.data;
      const metadata = checkout.metadata || {};
      const userId = metadata.userId;
      const licenseType = metadata.licenseType || 'lifetime';
      const paymentId = checkout.id;

      if (!userId) {
        console.error('Checkout completed but userId missing in metadata', checkout);
        return Response.json(
          { error: 'Missing userId in metadata', received: true },
          { status: 400 }
        );
      }

      console.log(`Processing payment for user ${userId}, type: ${licenseType}`);

      try {
        // Route to appropriate license endpoint based on license type
        const endpoint = licenseType === 'trial'
          ? '/api/license/claim-trial'
          : '/api/license/generate-paid';

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              userId,
              licenseType,
              paymentId,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('License generation failed:', errorText);
          throw new Error('Failed to generate license after payment');
        }

        const licenseData = await response.json();
        console.log(`Successfully generated ${licenseType} license: ${licenseData.key}`);

        // Send confirmation email (optional)
        // You can add email sending logic here

      } catch (licenseError) {
        console.error('Error in license generation flow:', licenseError);
        // Still acknowledge the webhook but log for manual review
        return Response.json(
          {
            error: 'License generation failed but webhook acknowledged',
            received: true,
            details: licenseError instanceof Error ? licenseError.message : String(licenseError),
          },
          { status: 202 }
        );
      }
    }

    // Handle checkout expired (optional)
    if (eventType === 'checkout.expired') {
      const checkout = event.data;
      console.log(`Checkout expired: ${checkout.id}`);
    }

    // Acknowledge receipt of webhook
    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent Polar from retrying
    return Response.json(
      {
        error: 'Webhook processing failed',
        received: true,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 200 }
    );
  }
}
