import { useEffect, useRef } from 'react';
import { removeUserSession } from './auth';
import { toast } from './use-toast';

/**
 * Hook qui déconnecte l'utilisateur après 10 minutes d'inactivité
 * @param enabled - Active/désactive le timer (false pour désactiver)
 */
export function useInactivityLogout(enabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes en millisecondes

  const logout = () => {
    // Afficher toast
    toast({
      title: 'Session expirée',
      description: 'Déconnexion pour inactivité (10 minutes).',
      variant: 'default',
      className: 'border-amber-500 bg-amber-50',
    });

    // Clear session
    removeUserSession();

    // Rediriger vers login après 1.5s
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  };

  const resetTimer = () => {
    if (!enabled) return;

    // Clear timer existant
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Créer nouveau timer
    timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    if (!enabled) return;

    // Événements à écouter
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Ajouter listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Démarrer timer initial
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [enabled]);
}