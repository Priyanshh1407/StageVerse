import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Page-level gate (Next 16 "proxy", formerly middleware). It only decides which *pages* a role may open.
// Every API route still authenticates and authorizes itself (lib/auth.js, lib/authz.js),
// because the proxy never runs for Socket.IO and is easy to bypass by calling the API directly.

// Home dashboard for each role
const homeFor = {
  fan: '/dashboard',
  artist: '/artist-dashboard',
  organizer: '/manage/dashboard',
  production: '/prod-dashboard',
};

// Pages that belong to one role (mirrors the app/(role) route groups)
const rolePages = {
  fan: ['/dashboard', '/discover', '/memory-vault', '/ticket'],
  artist: ['/artist-dashboard', '/day-sheet', '/guest-list', '/live-show', '/setlist-builder', '/tech-rider'],
  organizer: ['/manage', '/analysis', '/create-event', '/reports', '/ticketing'],
  production: ['/prod-dashboard', '/live', '/logistics', '/patch-sheet', '/patch-studio', '/tasks'],
};

// Open to everyone
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/contact',
  '/about',
  '/artist',
  '/explore',
  '/explore-artist',
  '/events',
  '/lab',             // internal 3D test pages (noindex)
  '/gpu-benchmarks',  // self-hosted GPU tier data for the 3D homepage
  '/audio',           // homepage show music (local only, never deployed)
  '/shows',           // programmed light shows (derived data, no audio)
  '/api', // API routes do their own auth
];

// Segment-aware prefix match: '/live' matches '/live' and '/live/123' but not '/live-show'
const matches = (pathname, prefix) =>
  prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/');

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

async function readRole(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export async function proxy(req) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => matches(pathname, p))) {
    // Logged-in users visiting login/signup go to their dashboard
    if (pathname === '/login' || pathname === '/signup') {
      const role = await readRole(token);
      if (role) return NextResponse.redirect(new URL(homeFor[role] || '/', req.url));
    }
    return NextResponse.next();
  }

  const role = await readRole(token);
  if (!role) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    if (token) response.cookies.delete('token'); // expired or tampered
    return response;
  }

  const owner = Object.keys(rolePages).find((r) => rolePages[r].some((p) => matches(pathname, p)));
  if (owner && owner !== role) {
    return NextResponse.redirect(new URL(homeFor[role] || '/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon
     * - public asset folders and static file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|images|models|textures|.*\\.glb$|.*\\.gltf$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.exr$|.*\\.hdr$|.*\\.ico$).*)',
  ],
};
