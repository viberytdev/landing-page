import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClaimTrialResponse {
  success: boolean;
  message: string;
  licenseKey?: string;
  error?: string;
}

/**
 * Hook to claim a free trial license
 * Usage:
 *
 * const { claimTrial, loading, error } = useClaimTrial();
 *
 * const handleClick = async () => {
 *   const token = await getSessionToken(); // From Supabase
 *   const result = await claimTrial(userId, token);
 *   if (result.success) {
 *     // Navigate to dashboard with success message
 *   }
 * };
 */
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
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        const data: ClaimTrialResponse = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to claim trial');
          return {
            success: false,
            message: '',
            error: data.error || 'Failed to claim trial',
          };
        }

        return {
          success: true,
          message: data.message,
          licenseKey: data.licenseKey, // Only in development
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        return {
          success: false,
          message: '',
          error: message,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { claimTrial, loading, error };
}
