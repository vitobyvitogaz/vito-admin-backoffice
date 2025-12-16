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
