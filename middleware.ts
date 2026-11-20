import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Le cookie `vito_auth_token` est posé à la connexion (lib/auth.ts) et supprimé à la déconnexion,
// à l'expiration de session et après inactivité. Il sert uniquement à rediriger : l'accès aux
// données est protégé par le backend, qui vérifie le jeton à chaque appel API.
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get('vito_auth_token')?.value)
  const { pathname } = request.nextUrl
  const isLoginPage = pathname === '/login'
  // /login et ses sous-pages (mot de passe oublié, réinitialisation) restent publiques
  const isPublic = isLoginPage || pathname.startsWith('/login/')

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Exclut l'API, les fichiers statiques de Next et tout fichier avec extension (logo, icônes…)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
