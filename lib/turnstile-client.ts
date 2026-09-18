'use client';

/**
 * Client side of the Turnstile check.
 *
 * The approved design has no visible captcha, so Turnstile runs in its
 * invisible mode: the widget renders into a zero-size container outside the
 * ported markup and hands us a token, which the view models attach to the
 * submission. With no `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set, nothing loads and
 * the server skips the check — the honeypot field still applies.
 */

let token: string | null = null;

export function setTurnstileToken(value: string | null) {
  token = value;
}

export function getTurnstileToken(): string | undefined {
  return token ?? undefined;
}

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
