/**
 * @fileoverview Next.js Middleware implementing security headers.
 * Applies strict Content-Security-Policy (CSP) and Permissions-Policy.
 */

import { NextResponse } from 'next/server';

export function middleware() {
  const response = NextResponse.next();

  // 1. Permissions-Policy: Restricts device APIs. Allows geolocation for mapping, blocks others.
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=(), interest-cohort=()'
  );

  // 2. Content-Security-Policy (CSP): Tailored to permit Firebase, Google Maps, GA4, and GTM
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com;
    connect-src 'self' https://maps.googleapis.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google-analytics.com https://stats.g.doubleclick.net;
    img-src 'self' data: https://maps.gstatic.com https://maps.googleapis.com https://*.ggpht.com https://www.google-analytics.com https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' data: https://fonts.gstatic.com;
    frame-src 'self' https://*.firebaseapp.com https://*.firebase.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  // 3. Additional security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

// Apply middleware to all pages and assets (ignoring internal Next.js files and static images)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
