const AUTH_COOKIE = 'vito_auth_token'

// Témoin de session lu par middleware.ts pour rediriger vers /login. Il ne prouve rien :
// la sécurité réelle reste la vérification du jeton par le backend à chaque appel API.
function setAuthCookie() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_COOKIE}=1; Path=/; SameSite=Lax${secure}`
}

function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vito_auth_token', token)
    setAuthCookie()
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('vito_auth_token')
  }
  return null
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vito_auth_token')
    clearAuthCookie()
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

// ── Gestion du rôle ──────────────────────────────────────────────────────────

export function setUserRole(role: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vito_user_role', role)
  }
}

export function getUserRole(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('vito_user_role')
  }
  return null
}

export function setUserEmail(email: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vito_user_email', email)
  }
}

export function getUserEmail(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('vito_user_email')
  }
  return null
}

export function removeUserSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('vito_auth_token')
    localStorage.removeItem('vito_user_role')
    localStorage.removeItem('vito_user_email')
    clearAuthCookie()
  }
}