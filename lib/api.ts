import { getAuthToken } from './auth';

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

  // Si 401, rediriger vers login
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vito_auth_token');
      window.location.href = '/login';
    }
  }

  return response;
}

/**
 * Helper pour GET
 */
export async function apiGet<T>(url: string): Promise<T> {
  const response = await apiFetch(url, { method: 'GET' });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper pour POST
 */
export async function apiPost<T>(url: string, data: any): Promise<T> {
  const response = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper pour PATCH
 */
export async function apiPatch<T>(url: string, data: any): Promise<T> {
  const response = await apiFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper pour DELETE
 */
export async function apiDelete(url: string): Promise<void> {
  const response = await apiFetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
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
}