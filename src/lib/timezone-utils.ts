/**
 * Timezone utilities for consistent display across the app
 */

/**
 * Convert ISO timestamp to user's local date string
 * @param isoString ISO 8601 timestamp from database
 * @returns Formatted date in user's local timezone
 */
export function formatLocalDate(isoString: string | null): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid date';
  }
}

/**
 * Convert ISO timestamp to user's local date and time string
 * @param isoString ISO 8601 timestamp from database
 * @returns Formatted date and time in user's local timezone
 */
export function formatLocalDateTime(isoString: string | null): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (err) {
    console.error('Error formatting datetime:', err);
    return 'Invalid date';
  }
}

/**
 * Check if a date has expired (in user's local timezone)
 * @param expiresAtIso ISO 8601 timestamp from database
 * @returns true if the date is in the past
 */
export function isDateExpired(expiresAtIso: string | null): boolean {
  if (!expiresAtIso) return false;
  try {
    const expiresAt = new Date(expiresAtIso);
    const now = new Date();
    return expiresAt < now;
  } catch (err) {
    console.error('Error checking expiration:', err);
    return false;
  }
}

/**
 * Get days remaining until expiration
 * @param expiresAtIso ISO 8601 timestamp from database
 * @returns Number of days remaining, or 0 if expired
 */
export function getDaysRemaining(expiresAtIso: string | null): number {
  if (!expiresAtIso) return 0;
  try {
    const expiresAt = new Date(expiresAtIso);
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (err) {
    console.error('Error calculating days remaining:', err);
    return 0;
  }
}
