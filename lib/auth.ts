export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('vito_auth_token', token)
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
  }
}