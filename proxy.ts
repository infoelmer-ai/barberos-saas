import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas del dominio principal que NO son tenants
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'superadmin',
  'auth',
  'login',
  'register',
  'onboard',
  'dashboard',
])

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'barberos.com'
  const url = request.nextUrl

  // En localhost permitimos ?tenant=slug para simular subdominios en dev
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const devTenant = url.searchParams.get('tenant')
    if (devTenant && !url.pathname.startsWith('/t/')) {
      const newUrl = url.clone()
      newUrl.pathname = `/t/${devTenant}${url.pathname === '/' ? '' : url.pathname}`
      newUrl.searchParams.delete('tenant')
      return NextResponse.rewrite(newUrl)
    }
    return NextResponse.next()
  }

  // En producción: detectar subdominio
  const hostnameNoPort = hostname.split(':')[0]
  const isApex = hostnameNoPort === rootDomain || hostnameNoPort === `www.${rootDomain}`

  if (isApex) return NextResponse.next()

  // Extraer subdominio (ej: "barber-king" de "barber-king.barberos.com")
  const suffix = `.${rootDomain}`
  if (!hostnameNoPort.endsWith(suffix)) return NextResponse.next()

  const subdomain = hostnameNoPort.slice(0, -suffix.length)
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return NextResponse.next()

  // Si ya está en /t/[slug] no rewrite (evita loop)
  if (url.pathname.startsWith('/t/')) return NextResponse.next()

  // Rewrite a /t/[slug]/...
  const newUrl = url.clone()
  newUrl.pathname = `/t/${subdomain}${url.pathname === '/' ? '' : url.pathname}`
  return NextResponse.rewrite(newUrl)
}

export const config = {
  matcher: [
    // Excluir api, _next, favicon, archivos estáticos
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
