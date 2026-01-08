'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getLicenseSession,
  setLicenseIntent,
  markClaimAttempted,
  markClaimSuccessful,
  clearLicenseSession,
} from '@/lib/session-storage';

interface ClaimTrialResponse {
  success: boolean;
  message: string;
  licenseKey?: string;
  error?: string;
  existing?: {
    licenseKey: string;
    type: string;
    createdAt: string;
    expiresAt: string | null;
  };
}

/**
 * Hook to manage the complete license claim flow
 * Handles:
 * 1. Setting intent when user clicks "Claim Trial"
 * 2. Automatic claim after user signs up
 * 3. Error handling and retry logic
 */
export function useLicenseFlow() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingLicense, setExistingLicense] = useState<any>(null);

  /**
   * Step 1: User clicks "Claim Trial" button
   * Sets the intent and redirects to signup
   */
  const startTrialFlow = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      // Check if user is already authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // User is already logged in, claim trial immediately
        console.log('[Flow] User already authenticated, claiming trial directly');
        const result = await claimTrialLicense(user.id);
        
        if (result.success) {
          setSuccess(true);
          clearLicenseSession();
          router.push('/dashboard?trial=claimed');
        } else {
          setError(result.error || 'Failed to claim trial');
        }
      } else {
        // User not authenticated, set intent and redirect to signup
        console.log('[Flow] User not authenticated, setting intent and redirecting to signup');
        setLicenseIntent('trial');
        router.push('/auth/signup?source=trial');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      console.error('[Flow] Error in startTrialFlow:', message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Step 2: Called after signup, attempts to claim the trial license
   * This is called by the signup page after user account is created
   */
  const claimTrialAfterSignup = useCallback(
    async (userId: string): Promise<ClaimTrialResponse> => {
      const session = getLicenseSession();

      if (!session.intent) {
        console.log('[Flow] No license intent in session');
        return {
          success: false,
          message: '',
          error: 'No license claim in progress',
        };
      }

      console.log('[Flow] Attempting to claim trial after signup for user:', userId);
      markClaimAttempted();

      return claimTrialLicense(userId);
    },
    []
  );

  /**
   * Step 3: Actually call the license claim API
   */
  const claimTrialLicense = useCallback(
    async (userId: string): Promise<ClaimTrialResponse> => {
      try {
        console.log('[Flow] Making API call to claim trial for user:', userId);
        
        const response = await fetch('/api/license', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        console.log('[Flow] API response status:', response.status);

        // Always try to parse as JSON first
        let data: any;
        try {
          data = await response.json();
        } catch (parseErr) {
          // If JSON parsing fails, the response was not valid JSON
          console.error('[Flow] Failed to parse response as JSON:', parseErr);
          throw new Error(`Server returned invalid response (status ${response.status}). Please try again.`);
        }

        // Check if response was successful based on status code
        if (response.ok && data) {
          console.log('[Flow] Trial license claimed successfully');
          markClaimSuccessful();
          setSuccess(true);
          return {
            success: true,
            message: data.message || 'Trial license claimed successfully',
            licenseKey: data.licenseKey,
          };
        } else {
          // If user already has a license, show the existing license info
          if (data?.existing) {
            const existing = data.existing;
            console.log('[Flow] User already has a license:', existing.type);
            setExistingLicense(existing);
            return {
              success: false,
              message: '',
              error: 'existing_license',
              existing,
            };
          }
          
          // Response had an actual error
          const errorMsg = data?.error || `Request failed with status ${response.status}`;
          console.error('[Flow] Trial claim failed with status', response.status, ':', errorMsg);
          setError(errorMsg);
          return {
            success: false,
            message: '',
            error: errorMsg,
          };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Flow] Exception during trial claim:', message);
        setError(message);
        return {
          success: false,
          message: '',
          error: message,
        };
      }
    },
    []
  );

  /**
   * Check if we should auto-claim after login/signup
   * This can be called from various pages to complete pending claims
   */
  const checkAndClaimPendingLicense = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('[Flow] No authenticated user for pending license claim');
        return;
      }

      const session = getLicenseSession();
      if (!session.intent || session.claimSuccessful) {
        console.log('[Flow] No pending license claim');
        return;
      }

      console.log('[Flow] Found pending license claim, attempting...');
      const result = await claimTrialLicense(user.id);

      if (result.success) {
        router.push('/dashboard?trial=claimed');
      }
    } catch (err) {
      console.error('[Flow] Error checking pending license:', err);
    }
  }, [router, claimTrialLicense]);

  return {
    startTrialFlow,
    claimTrialAfterSignup,
    claimTrialLicense,
    checkAndClaimPendingLicense,
    loading,
    error,
    success,
    existingLicense,
    clearError: () => setError(null),
    clearExistingLicense: () => setExistingLicense(null),
  };
}
