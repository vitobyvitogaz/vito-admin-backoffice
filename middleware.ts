import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('vito_auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Récupérer le token depuis localStorage via headers (si disponible)
  const isLoginPage = request.nextUrl.pathname === '/login'
  
  // Si pas de token et pas sur la page login, rediriger vers login
  if (!token && !isLoginPage) {
    // En mode développement, on laisse passer (le token sera vérifié côté client)
    // En production, décommenter la ligne suivante:
    // return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si token présent et sur page login, rediriger vers dashboard
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
