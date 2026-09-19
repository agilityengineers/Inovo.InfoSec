import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { leadSubmission } from '@/lib/validation';
import { brandBySlug } from '@/lib/repo';
import { activeScoring, qualificationRule, insertLead, logIntegrationEvent } from '@/lib/repo';
import { buildMspPayload, buildPartnerPayload, buildClientPayload } from '@/lib/payload';
import { fanOut } from '@/lib/integrations';
import { VERTICALS } from '@/lib/data/client';
import { verifyTurnstile } from '@/lib/turnstile';
import type { Answers } from '@/lib/scoring/answers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The client sends answers; the score, tier and qualification are computed here. */
function toAnswers(raw: Record<string, number>): Answers {
  const out: Answers = {};
  for (const [k, v] of Object.entries(raw)) {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < 24) out[i] = v;
  }
  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let submission;
  try {
    submission = leadSubmission.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      for (const issue of error.issues) {
        errors[issue.path[issue.path.length - 1] as string] = issue.message;
      }
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 422 });
    }
    throw error;
  }

  const turnstile = await verifyTurnstile(submission.turnstileToken, request);
  if (!turnstile.ok) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }

  const brand = await brandBySlug(submission.brandSlug);
  if (!brand) {
    return NextResponse.json({ error: 'Unknown brand' }, { status: 404 });
  }

  const host = submission.source?.host || new URL(request.url).host;
  const source = { host, utm: submission.source?.utm ?? null };

  let payload;
  if (submission.type === 'assessment_lead') {
    payload = buildMspPayload(submission.lead, toAnswers(submission.answers), brand, {
      scoring: await activeScoring(),
      source,
    });
  } else if (submission.type === 'partner_inquiry') {
    payload = buildPartnerPayload(submission.form, brand, brand.econ, source);
  } else {
    const vertical = VERTICALS[brand.vertical || 'cmmc'] || VERTICALS.cmmc;
    payload = buildClientPayload(submission.lead, toAnswers(submission.answers), brand, vertical, {
      qual: await qualificationRule(),
      source,
    });
  }

  const lead = await insertLead(payload);

  // Fan out after the lead is safely persisted, so a failing integration can
  // never cost us the lead itself.
  let results: Awaited<ReturnType<typeof fanOut>> = [];
  try {
    results = await fanOut(lead.id, payload, brand);
  } catch (error) {
    await logIntegrationEvent({
      leadId: lead.id,
      target: 'fan-out',
      status: 'failed',
      message: error instanceof Error ? error.message : String(error),
    });
    results = [];
  }

  return NextResponse.json({
    id: lead.id,
    score: payload.assessment?.score ?? null,
    qualification: payload.qualification?.tier ?? null,
    integrations: results,
  });
}
