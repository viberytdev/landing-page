import { createClient } from '@supabase/supabase-js';

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
 * Server-side authentication utilities
 */

export interface AuthCheckResult {
  isAuthenticated: boolean;
  userId?: string;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  error?: string;
}

/**
 * Verify that a user ID corresponds to a valid authenticated user
 * Useful for validating that a request is coming from an authenticated user
 */
export async function verifyUserId(userId: string): Promise<AuthCheckResult> {
  try {
    if (!userId) {
      return {
        isAuthenticated: false,
        error: 'No user ID provided',
      };
    }

    const supabase = getSupabaseClient();

    // Use the admin API to verify the user exists
    const { data, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !data.user) {
      console.error('User verification failed:', error);
      return {
        isAuthenticated: false,
        error: 'User not found or authentication failed',
      };
    }

    return {
      isAuthenticated: true,
      userId: data.user.id,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role: data.user.role,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error verifying user:', message);
    return {
      isAuthenticated: false,
      error: message,
    };
  }
}

/**
 * Check if a given token is valid and get the associated user
 * Useful for validating Authorization headers
 */
export async function verifyToken(
  token: string
): Promise<AuthCheckResult> {
  try {
    if (!token) {
      return {
        isAuthenticated: false,
        error: 'No token provided',
      };
    }

    const supabase = getSupabaseClient();

    // Verify the JWT token
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('Token verification failed:', error);
      return {
        isAuthenticated: false,
        error: 'Invalid or expired token',
      };
    }

    return {
      isAuthenticated: true,
      userId: data.user.id,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        role: data.user.role,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error verifying token:', message);
    return {
      isAuthenticated: false,
      error: message,
    };
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Validate request authentication
 * Checks either the userId in body or the Authorization header
 */
export async function validateRequestAuth(
  userId?: string,
  authHeader?: string
): Promise<AuthCheckResult> {
  // If userId is provided, verify it
  if (userId) {
    return verifyUserId(userId);
  }

  // Otherwise, try to extract and verify token from Authorization header
  const token = extractBearerToken(authHeader);
  if (token) {
    return verifyToken(token);
  }

  return {
    isAuthenticated: false,
    error: 'No authentication provided (userId or Authorization header required)',
  };
}
