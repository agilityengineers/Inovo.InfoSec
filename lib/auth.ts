import 'server-only';

/**
 * Admin authentication.
 *
 * A single admin credential from env, carried in a signed, httpOnly cookie.
 * Deliberately small and behind this interface: swapping in NextAuth with an
 * email magic link means reimplementing `currentSession()` and `signIn()`,
 * with no change to the routes that call `requireAdmin()`.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'inovo_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12;

export type Session = { email: string; expires: number };

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SESSION_SECRET is required in production');
  }
  // Development convenience only; restarting invalidates existing sessions.
  return 'dev-only-insecure-secret';
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function serializeSession(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function parseSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    return session.expires > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function currentSession(): Session | null {
  return parseSession(cookies().get(COOKIE)?.value);
}

/** Redirects to the sign-in page unless a valid admin session is present. */
export function requireAdmin(): Session {
  const session = currentSession();
  if (!session) redirect('/admin/login');
  return session;
}

/** For route handlers, which answer with a status rather than a redirect. */
export function requireAdminApi(): Session | null {
  return currentSession();
}

export function checkCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  // Compare both, always, so a wrong email and a wrong password cost the same.
  const emailOk = safeEqual(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase());
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

export function sessionCookie(session: Session) {
  return {
    name: COOKIE,
    value: serializeSession(session),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}

export function newSession(email: string): Session {
  return { email, expires: Date.now() + MAX_AGE_SECONDS * 1000 };
}

export function clearedCookie() {
  return { name: COOKIE, value: '', httpOnly: true, path: '/', maxAge: 0 };
}

export { COOKIE as ADMIN_COOKIE, randomBytes };
