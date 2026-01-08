'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Session Provider Hook
 * Ensures Supabase session is restored on app initialization and page navigation
 * This prevents the user from appearing logged out when navigating between pages
 */
export function useSessionRestore() {
  useEffect(() => {
    console.log('[SessionRestore] Checking for existing session...');

    // Check if session exists
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[SessionRestore] Error getting session:', error);
          return;
        }

        if (session) {
          console.log('[SessionRestore] Session found, user:', session.user.email);
        } else {
          console.log('[SessionRestore] No session found');
        }
      } catch (err) {
        console.error('[SessionRestore] Exception checking session:', err);
      }
    };

    checkSession();

    // Also listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SessionRestore] Auth state changed:', event);
      if (session) {
        console.log('[SessionRestore] User logged in:', session.user.email);
      } else {
        console.log('[SessionRestore] User logged out');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
}
