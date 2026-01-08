import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  if (token_hash && type) {
    // Create a new supabase client for this request
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the OTP token
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });

    if (!error) {
      // Email verified successfully - redirect to login
      return NextResponse.redirect(new URL('/auth/login?verified=true', requestUrl.origin));
    }

    // Check if error is because user is already confirmed
    if (error?.message?.includes('already') || error?.message?.includes('confirmed')) {
      // User is already verified, just redirect to login
      return NextResponse.redirect(new URL('/auth/login?verified=true', requestUrl.origin));
    }

    console.error('Verification error:', error);
  }

  // If verification failed, redirect to login (without error for already verified users)
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}
