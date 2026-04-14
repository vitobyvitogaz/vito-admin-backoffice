import { getAuthToken } from './auth';
import { toast } from './use-toast';

/**
 * Wrapper fetch qui ajoute automatiquement le token JWT
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Construire l'URL complète
  const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;

  // Ajouter le token dans les headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Faire la requête
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Si 401, session expirée
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      // Afficher message avant redirection
      toast({
        title: 'Session expirée',
        description: 'Votre session a expiré. Veuillez vous reconnecter.',
        variant: 'default',
        className: 'border-amber-500 bg-amber-50',
      });

      // Clear token
      localStorage.removeItem('vito_auth_token');
      localStorage.removeItem('vito_user_role');
      localStorage.removeItem('vito_user_email');

      // Rediriger après 1.5s pour laisser le toast s'afficher
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }

    // Throw erreur pour empêcher le reste du code de s'exécuter
    throw new Error('SESSION_EXPIRED');
  }

  return response;
}

/**
 * Helper pour GET
 */
export async function apiGet<T>(url: string): Promise<T> {
  try {
    const response = await apiFetch(url, { method: 'GET' });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }
    
    return response.json();
  } catch (error: any) {
    // Si session expirée, propager l'erreur sans toast supplémentaire
    if (error.message === 'SESSION_EXPIRED') {
      throw error;
    }
    // Autres erreurs
    throw new Error(error.message || 'Erreur lors du chargement');
  }
}

/**
 * Helper pour POST
 */
export async function apiPost<T>(url: string, data: any): Promise<T> {
  try {
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }
    
    return response.json();
  } catch (error: any) {
    if (error.message === 'SESSION_EXPIRED') {
      throw error;
    }
    throw new Error(error.message || 'Erreur lors de la sauvegarde');
  }
}

/**
 * Helper pour PATCH
 */
export async function apiPatch<T>(url: string, data: any): Promise<T> {
  try {
    const response = await apiFetch(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }
    
    return response.json();
  } catch (error: any) {
    if (error.message === 'SESSION_EXPIRED') {
      throw error;
    }
    throw new Error(error.message || 'Erreur lors de la modification');
  }
}

/**
 * Helper pour DELETE
 */
export async function apiDelete(url: string): Promise<void> {
  try {
    const response = await apiFetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }
    
    // DELETE peut retourner du JSON ou rien
    const text = await response.text();
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return;
      }
    }
  } catch (error: any) {
    if (error.message === 'SESSION_EXPIRED') {
      throw error;
    }
    throw new Error(error.message || 'Erreur lors de la suppression');
  }
}