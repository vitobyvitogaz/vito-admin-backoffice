'use client';

import { useEffect } from 'react';
import { useInactivityLogout } from '@/lib/useInactivityLogout';
import { isAuthenticated } from '@/lib/auth';

/**
 * Composant qui surveille l'inactivité de l'utilisateur
 * À placer dans le layout principal de l'admin
 */
export function InactivityMonitor({ children }: { children: React.ReactNode }) {
  const isAuth = isAuthenticated();

  // Activer le timer uniquement si authentifié
  useInactivityLogout(isAuth);

  return <>{children}</>;
}