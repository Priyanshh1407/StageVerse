import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// 1. DEFINITION: Where does each role belong?
const rolePaths = {
  fan: ['/dashboard'],
  artist: ['/artist-dashboard'],
  organizer: ['/manage/dashboard'],
  production: ['/prod-dashboard'],
};

// 2. DEFINITION: Which pages are OPEN to everyone?
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/api/auth',
  '/contact',
  '/about',
  '/artist',
  '/explore',
  '/explore-artist',
  '/events',
  '/api/socket',
  '/api/description',
  '/api/patch'
];

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // -----------------------------------------------------------
  // A. PUBLIC ROUTE CHECK (The Fix 🔧)
  // -----------------------------------------------------------
  // We check if the current path STARTS with any of the public routes
  // (e.g., /explore/event-1 starts with /explore, so it's allowed)
  const isPublic = publicPaths.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublic) {
    // If you are already logged in and try to visit Login/Signup, 
    // we kindly redirect you to your dashboard.
    if (token && (pathname === '/login' || pathname === '/signup')) {
      try {
        const { payload } = await jwtVerify(token, secret);
        const myDashboard = rolePaths[payload.role]?.[0] || '/dashboard';
        return NextResponse.redirect(new URL(myDashboard, req.url));
      } catch (e) {
        // Token invalid, let them go to login
        return NextResponse.next();
      }
    }
    // Otherwise, let them see the public page!
    return NextResponse.next();
  }

  // -----------------------------------------------------------
  // B. AUTHENTICATION CHECK (Protected Routes)
  // -----------------------------------------------------------

  // 1. No Token? -> Go to Login
  if (!token) {
    // Store the url they wanted to visit? (Optional feature for later)
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // 2. Verify Token
    const { payload } = await jwtVerify(token, secret);
    const userRole = payload.role;

    // 3. Strict Role Check (Prevent Fan from seeing Artist pages)
    const targetRole = Object.keys(rolePaths).find(role =>
      rolePaths[role].some(path => pathname.startsWith(path))
    );

    if (targetRole && targetRole !== userRole) {
      // Redirect to THEIR dashboard
      const myDashboard = rolePaths[userRole]?.[0] || '/dashboard';
      return NextResponse.redirect(new URL(myDashboard, req.url));
    }

    return NextResponse.next();

  } catch (err) {
    // Token is corrupt or expired
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};