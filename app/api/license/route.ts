import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { licenseGenerator } from '@/lib/license-key-generator';
import {
  storeLicenseKey,
  updateUserTrialStatus,
  hasActiveLicense,
} from '@/lib/license-db';

// Get Supabase client - deferred initialization to runtime
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Claim a free trial license
 * Called when user clicks "Claim Free Trial" on landing page
 *
 * Expected request body:
 * {
 *   userId: string (from auth session)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   licenseKey?: string (for testing/dev only)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API] JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { userId } = body;

    if (!userId) {
      console.error('[API] No userId provided');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Claim trial request for user:', userId);

    // Initialize Supabase client with service role
    const supabase = getSupabaseClient();

    // Verify user exists in auth system
    console.log('[API] Verifying user exists...');
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user) {
      console.error('[API] User not found or error:', userError);
      return NextResponse.json(
        {
          success: false,
          error: 'User not found. Please ensure you are signed in.',
        },
        { status: 404 }
      );
    }

    const userEmail = userData.user.email || '';
    console.log('[API] User found, email:', userEmail);

    // Ensure user_profiles entry exists (required for foreign key)
    console.log('[API] Ensuring user_profiles entry exists...');
    const { error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('[API] Creating user_profiles entry for user:', userId);
      const { error: profileCreateError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          subscription_type: 'none',
        });

      if (profileCreateError) {
        console.error('[API] Failed to create user_profiles:', profileCreateError);
        // Don't fail here, the user might already have a profile
      } else {
        console.log('[API] User profile created successfully');
      }
    } else if (profileCheckError) {
      console.error('[API] Error checking user_profiles:', profileCheckError);
    } else {
      console.log('[API] User profile already exists');
    }

    // Check if user already has an active trial license
    console.log('[API] Checking for active trial...');
    const hasActiveTrial = await hasActiveLicense(userId, 'trial');
    if (hasActiveTrial) {
      console.log('[API] User already has active trial, fetching existing license...');
      
      // Fetch and return the existing trial license
      const { data: existingLicense, error: fetchError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('key_type', 'trial')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fetchError && existingLicense) {
        return NextResponse.json(
          {
            success: false,
            error: 'You already have an active trial license.',
            existing: {
              licenseKey: existingLicense.license_key,
              type: existingLicense.key_type,
              createdAt: existingLicense.created_at,
              expiresAt: existingLicense.expires_at,
              isActivated: existingLicense.is_activated,
            },
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'You already have an active trial license.',
        },
        { status: 409 }
      );
    }

    // Check if user already has a lifetime/paid license
    console.log('[API] Checking for lifetime license...');
    const hasLifetime = await hasActiveLicense(userId, 'lifetime');
    if (hasLifetime) {
      console.log('[API] User already has lifetime license, fetching existing license...');
      
      // Fetch and return the existing lifetime license
      const { data: existingLicense, error: fetchError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('key_type', 'lifetime')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!fetchError && existingLicense) {
        return NextResponse.json(
          {
            success: false,
            error: 'You already have a lifetime license.',
            existing: {
              licenseKey: existingLicense.license_key,
              type: existingLicense.key_type,
              createdAt: existingLicense.created_at,
              expiresAt: existingLicense.expires_at,
              isActivated: existingLicense.is_activated,
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'You already have a lifetime license. Cannot claim trial.',
        },
        { status: 409 }
      );
    }

    // Generate trial license key (7 days)
    const TRIAL_DAYS = 7;
    console.log('[API] Generating trial license key...');
    const { licenseKey, metadata } = licenseGenerator.generateTrialKey(
      userData.user.user_metadata?.full_name || userEmail,
      userEmail
    );
    console.log('[API] Generated license key:', licenseKey);

    // Store license key in database
    console.log('[API] Storing license key in database...');
    console.log('[API] License key details:', { userId, licenseKey: licenseKey.substring(0, 10) + '...', keyType: 'trial', daysValid: TRIAL_DAYS });
    
    const licenseResult = await storeLicenseKey({
      userId,
      licenseKey,
      keyType: 'trial',
      daysValid: TRIAL_DAYS,
    });

    if (!licenseResult.success) {
      console.error('[API] Failed to store license key:', licenseResult.error);
      return NextResponse.json(
        { success: false, error: licenseResult.error || 'Failed to generate trial license' },
        { status: 500 }
      );
    }

    console.log('[API] License key stored successfully');

    // Update user subscription type to 'trial' in user_profiles
    console.log('[API] Updating subscription type to trial...');
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ subscription_type: 'trial' })
      .eq('id', userId);

    if (updateError) {
      console.error('[API] Failed to update subscription type:', updateError);
      // Don't fail the request if profile update fails
    } else {
      console.log('[API] Subscription type updated to trial');
    }

    // TODO: Send email via Resend with license key
    console.log(`[API] 📧 TODO: Send trial license key to ${userEmail}: ${licenseKey}`);

    console.log('[API] Trial claim successful for user:', userId);
    return NextResponse.json(
      {
        success: true,
        message: `Success! Check your email (${userEmail}) for your trial license key.`,
        // Include key only in development for testing
        ...(process.env.NODE_ENV === 'development' && { licenseKey }),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[API] Claim trial error:', message);
    console.error('[API] Stack trace:', stack);
    console.error('[API] Full error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Server error: ${message}`,
        details: message // Include details for debugging
      },
      { status: 500 }
    );
  }
}
