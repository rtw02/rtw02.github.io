import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/login')) {
    const session = request.cookies.get('rw-session')
    const secret = process.env.DASHBOARD_SECRET
    if (!secret || session?.value !== secret) {
      return NextResponse.redirect(new URL('/dashboard/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
