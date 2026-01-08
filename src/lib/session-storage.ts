/**
 * Session Storage Utilities
 * Manages client-side session state for tracking user intent and authentication flow
 */

export interface LicenseClaimSession {
  intent: 'trial' | 'lifetime' | null;
  timestamp: number;
  claimAttempted: boolean;
  claimSuccessful: boolean;
}

const SESSION_KEY = 'viberyt_license_session';

/**
 * Get current license claim session from localStorage
 */
export function getLicenseSession(): LicenseClaimSession {
  try {
    if (typeof window === 'undefined') {
      console.log('[Session] Window undefined, returning empty session');
      return { intent: null, timestamp: 0, claimAttempted: false, claimSuccessful: false };
    }

    const stored = localStorage.getItem(SESSION_KEY);
    console.log('[Session] Retrieved from localStorage:', stored ? 'found' : 'not found');
    
    if (!stored) {
      return { intent: null, timestamp: 0, claimAttempted: false, claimSuccessful: false };
    }

    const session = JSON.parse(stored) as LicenseClaimSession;
    
    // Clear old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (session.timestamp < oneHourAgo) {
      console.log('[Session] Session expired, clearing');
      clearLicenseSession();
      return { intent: null, timestamp: 0, claimAttempted: false, claimSuccessful: false };
    }

    console.log('[Session] Session valid, intent:', session.intent);
    return session;
  } catch (error) {
    console.error('Error reading license session:', error);
    return { intent: null, timestamp: 0, claimAttempted: false, claimSuccessful: false };
  }
}

/**
 * Set license claim intent (when user clicks "Claim Trial")
 */
export function setLicenseIntent(intent: 'trial' | 'lifetime'): void {
  try {
    if (typeof window === 'undefined') return;

    const session: LicenseClaimSession = {
      intent,
      timestamp: Date.now(),
      claimAttempted: false,
      claimSuccessful: false,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log(`[Session] License intent set to: ${intent}`);
  } catch (error) {
    console.error('Error setting license session:', error);
  }
}

/**
 * Mark that we've attempted to claim a license
 */
export function markClaimAttempted(): void {
  try {
    if (typeof window === 'undefined') return;

    const session = getLicenseSession();
    session.claimAttempted = true;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log('[Session] Claim marked as attempted');
  } catch (error) {
    console.error('Error marking claim as attempted:', error);
  }
}

/**
 * Mark that license claim was successful
 */
export function markClaimSuccessful(): void {
  try {
    if (typeof window === 'undefined') return;

    const session = getLicenseSession();
    session.claimSuccessful = true;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log('[Session] Claim marked as successful');
  } catch (error) {
    console.error('Error marking claim as successful:', error);
  }
}

/**
 * Clear the license session
 */
export function clearLicenseSession(): void {
  try {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(SESSION_KEY);
    console.log('[Session] License session cleared');
  } catch (error) {
    console.error('Error clearing license session:', error);
  }
}

/**
 * Check if user is in the middle of a license claim flow
 */
export function isInLicenseFlow(): boolean {
  const session = getLicenseSession();
  return session.intent !== null && !session.claimSuccessful;
}

/**
 * Debug: Get session info
 */
export function getSessionDebugInfo(): string {
  const session = getLicenseSession();
  return `
    Intent: ${session.intent}
    Timestamp: ${new Date(session.timestamp).toISOString()}
    Claim Attempted: ${session.claimAttempted}
    Claim Successful: ${session.claimSuccessful}
    In Flow: ${isInLicenseFlow()}
  `;
}
