'use client';

import { ReactNode } from 'react';
import { useSessionRestore } from '@/hooks/useSessionRestore';

/**
 * SessionRestoreProvider
 * Wraps the app to restore Supabase session on initialization
 */
export function SessionRestoreProvider({ children }: { children: ReactNode }) {
  useSessionRestore();
  return children;
}
