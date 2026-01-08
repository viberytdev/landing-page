import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize Supabase client with service role (for server-side operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface StoreLicenseKeyParams {
  userId: string;
  licenseKey: string;
  keyType: 'trial' | 'lifetime' | 'demo';
  daysValid?: number;
  deviceId?: string;
}

export interface StoreLicenseKeyResult {
  success: boolean;
  data?: {
    id: string;
    userId: string;
    licenseKey: string;
    keyType: string;
    expiresAt: string | null;
    createdAt: string;
  };
  error?: string;
}

/**
 * Check if user already has an active/valid license of a specific type
 */
export async function hasActiveLicense(
  userId: string,
  keyType?: 'trial' | 'lifetime' | 'demo'
): Promise<boolean> {
  try {
    let query = supabase
      .from('license_keys')
      .select('id, expires_at, key_type, is_activated')
      .eq('user_id', userId);

    if (keyType) {
      query = query.eq('key_type', keyType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking active license:', error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    // Check if any license is still valid
    const now = new Date();
    return data.some((license: any) => {
      // Lifetime licenses are always active
      if (license.key_type === 'lifetime') {
        return true;
      }

      // Check expiration for other types
      if (license.expires_at) {
        const expiresAt = new Date(license.expires_at);
        return expiresAt > now;
      }

      return false;
    });
  } catch (error) {
    console.error('Exception checking active license:', error);
    return false;
  }
}

/**
 * Store a generated license key in the database with proper validation
 */
export async function storeLicenseKey(
  params: StoreLicenseKeyParams
): Promise<StoreLicenseKeyResult> {
  try {
    const { userId, licenseKey, keyType, daysValid, deviceId } = params;

    // Validate inputs
    if (!userId || !licenseKey) {
      return {
        success: false,
        error: 'Missing required parameters: userId and licenseKey',
      };
    }

    // For trial licenses, check if user already has an active trial
    if (keyType === 'trial') {
      const hasActiveTrial = await hasActiveLicense(userId, 'trial');
      if (hasActiveTrial) {
        return {
          success: false,
          error: 'User already has an active trial license',
        };
      }
    }

    // For lifetime licenses, check if user already has one
    if (keyType === 'lifetime') {
      const hasLifetime = await hasActiveLicense(userId, 'lifetime');
      if (hasLifetime) {
        return {
          success: false,
          error: 'User already has a lifetime license',
        };
      }
    }

    // Calculate expiration date if not lifetime
    let expiresAt = null;
    if (keyType !== 'lifetime' && daysValid && daysValid > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysValid);
      expiresAt = expirationDate.toISOString();
    }

    // Insert into license_keys table
    const { data, error } = await supabase
      .from('license_keys')
      .insert({
        user_id: userId,
        license_key: licenseKey,
        key_type: keyType,
        device_id: deviceId || null,
        expires_at: expiresAt,
        is_activated: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing license key:', error.message, error.code);
      console.error('Error details:', error);
      
      // Check if it's an RLS policy issue
      if (error.code === 'PGRST301' || error.message.includes('policy')) {
        console.error('🔒 RLS Policy Issue: Service role cannot insert into license_keys table');
        console.error('   Fix: Disable RLS on license_keys table or grant service role permissions');
      }
      
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        userId: data.user_id,
        licenseKey: data.license_key,
        keyType: data.key_type,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exception storing license key:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get license key for a user
 */
export async function getUserLicenseKey(userId: string) {
  try {
    const { data, error } = await supabase
      .from('license_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching license key:', error);
    return null;
  }
}

/**
 * Update user trial status
 */
export async function updateUserTrialStatus(
  userId: string,
  daysValid: number = 7
): Promise<{ success: boolean; error?: string }> {
  try {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + daysValid);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_type: 'trial',
        trial_activated_at: new Date().toISOString(),
        trial_ends_at: trialEndDate.toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating trial status:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exception updating trial status:', message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Create user profile (called after Supabase auth creates user)
 */
export async function createUserProfile(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        subscription_type: 'none',
      });

    if (error) {
      // Ignore if profile already exists
      if (error.code === '23505') {
        return { success: true };
      }
      console.error('Error creating user profile:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exception creating user profile:', message);
    return {
      success: false,
      error: message,
    };
  }
}
