import { NextResponse } from 'next/server';
import { hasDatabase } from '@/db';
import { listBrands, pingDatabase } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `/api/health` — one request that answers "did the deploy work?".
 *
 * Reports whether a database is configured and reachable, whether the seed data
 * is in place, and which integrations hold keys. Deliberately says nothing
 * about the values of those keys.
 */
export async function GET() {
  const configured = hasDatabase();
  // Probe the database directly: the ordinary reads fall back to seed data on
  // failure, so asking them would report "ok" through an outage.
  const ping = await pingDatabase();

  const checks: Record<string, unknown> = {
    status: configured && !ping.ok ? 'degraded' : 'ok',
    databaseConfigured: configured,
    databaseReachable: ping.ok,
  };
  if (!ping.ok && configured) checks.databaseError = ping.error;

  // `seeded` is false when the tables are reachable but empty — the signal that
  // `npm run db:seed` has not been run yet.
  checks.seeded = ping.ok ? (ping.brands ?? 0) > 0 : false;

  const brands = await listBrands();
  checks.tenants = brands.map((b) => ({ slug: b.slug, hostnames: b.hostnames }));
  checks.servingSeedFallback = configured && !ping.ok;

  checks.integrations = {
    hubspot: Boolean(process.env.HUBSPOT_ACCESS_TOKEN),
    zapier: Boolean(process.env.ZAPIER_HOOK_URL),
    email: Boolean(process.env.RESEND_API_KEY),
    turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY),
  };
  checks.adminConfigured = Boolean(
    process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET,
  );

  return NextResponse.json(checks, { status: checks.status === 'ok' ? 200 : 503 });
}
