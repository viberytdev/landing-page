/**
 * POST /api/payments/checkout
 * Creates a Polar checkout link for license purchases
 *
 * Request body:
 *   - userId: string (required)
 *   - licenseType: 'trial' | 'lifetime' (optional, defaults to 'lifetime')
 *
 * Response:
 *   - checkoutUrl: string (redirect user here)
 *   - checkoutId: string (for tracking)
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, licenseType = 'lifetime' } = body;

    // Validate required fields
    if (!userId) {
      return Response.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!['trial', 'lifetime'].includes(licenseType)) {
      return Response.json(
        { error: 'Invalid licenseType. Must be "trial" or "lifetime"' },
        { status: 400 }
      );
    }

    const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
    const polarTrialProductId = process.env.POLAR_TRIAL_PRODUCT_ID;
    const polarLifetimeProductId = process.env.POLAR_LIFETIME_PRODUCT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!polarAccessToken || !polarTrialProductId || !polarLifetimeProductId || !appUrl) {
      console.error('Missing Polar configuration:', {
        accessToken: !!polarAccessToken,
        trialProductId: !!polarTrialProductId,
        lifetimeProductId: !!polarLifetimeProductId,
        appUrl: !!appUrl,
      });
      return Response.json(
        { error: 'Payment service not configured' },
        { status: 500 }
      );
    }

    // Select the appropriate product ID based on license type
    const productId = licenseType === 'trial' 
      ? polarTrialProductId 
      : polarLifetimeProductId;

    // Create Polar checkout
    const checkoutResponse = await fetch(
      'https://api.polar.sh/v1/checkouts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${polarAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          success_url: `${appUrl}/dashboard?payment=success&userId=${encodeURIComponent(userId)}&licenseType=${encodeURIComponent(licenseType)}`,
          cancel_url: `${appUrl}/dashboard?payment=cancelled`,
          customer_email_optional: false,
          metadata: {
            userId,
            licenseType,
            timestamp: new Date().toISOString(),
          },
        }),
      }
    );

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      console.error('Polar API error:', errorData);
      return Response.json(
        { error: 'Failed to create checkout with payment provider' },
        { status: 500 }
      );
    }

    const checkout = await checkoutResponse.json();

    return Response.json({
      checkoutUrl: checkout.checkout_url,
      checkoutId: checkout.id,
      success: true,
    });
  } catch (error) {
    console.error('Checkout creation error:', error);
    return Response.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
