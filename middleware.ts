import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ถ้าเป็นหน้า login หรือ API ให้ผ่านไปเลย
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // เช็ค auth token
  const token = request.cookies.get('auth_token');

  if (!token) {
    // ไม่มี token -> redirect ไป login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token.value, SECRET_KEY);
    const role = payload.role as string;

    // เช็คสิทธิ์การเข้าถึงหน้า
    const permissions: Record<string, string[]> = {
      admin: ['/track-c', '/track-rollout', '/5p', '/debug'],
      user1: ['/track-c'],
      user2: ['/track-rollout'],
    };

    const allowedPages = permissions[role] || [];
    const hasAccess = allowedPages.some((page) => pathname.startsWith(page));

    if (!hasAccess) {
      // ไม่มีสิทธิ์ -> redirect ไปหน้าที่มีสิทธิ์หน้าแรก
      const firstAllowedPage = allowedPages[0] || '/login';
      return NextResponse.redirect(new URL(firstAllowedPage, request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // Token ไม่ถูกต้อง -> redirect ไป login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|login|api).*)',
  ],
};
