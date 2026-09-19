/**
 * Production environment validation.
 *
 * Checked once at server start (see `instrumentation.ts`) so a misconfigured
 * deployment fails immediately and visibly, rather than serving the public
 * pages happily and only failing at the point a lead is submitted or an admin
 * tries to sign in — which is exactly when you least want to find out.
 */

const REQUIRED_IN_PRODUCTION = [
  ['DATABASE_URL', 'Postgres connection string. On Replit, create a database and it is set for you.'],
  ['ADMIN_SESSION_SECRET', 'Signing key for the admin session cookie. Generate with: openssl rand -base64 32'],
  ['ADMIN_EMAIL', 'The admin sign-in email for /admin.'],
  ['ADMIN_PASSWORD', 'The admin sign-in password for /admin.'],
] as const;

/** Pairs of env vars where setting one without the other does nothing useful. */
const PAIRED = [
  ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'],
  ['RESEND_API_KEY', 'EMAIL_FROM'],
] as const;

export function validateEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_IN_PRODUCTION.filter(([name]) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      'Missing required environment variables in production:\n' +
        missing.map(([name, why]) => `  - ${name}: ${why}`).join('\n') +
        '\n\nAdd them to your deployment secrets. See .env.example.',
    );
  }

  for (const [a, b] of PAIRED) {
    if (Boolean(process.env[a]) !== Boolean(process.env[b])) {
      // Not fatal — the feature simply stays off — but always a mistake.
      // eslint-disable-next-line no-console
      console.warn(`[env] ${a} and ${b} must be set together; the feature stays disabled until both are.`);
    }
  }
}
