import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { brandBySlug, defaultBrand, insertLead, qualificationRule, activeScoring } from '@/lib/repo';
import { buildMspPayload, buildClientPayload } from '@/lib/payload';
import { QUESTIONS as MSP_QUESTIONS } from '@/lib/data/msp';
import { QUESTIONS as CLIENT_QUESTIONS, VERTICALS } from '@/lib/data/client';
import type { Answers } from '@/lib/scoring/answers';

export const dynamic = 'force-dynamic';

/**
 * Seeds the sample lead the approved admin screens offer, so the payload pane
 * and the qualification badges have something to show on a fresh install. The
 * answer patterns and the sample contacts are the prototype's.
 */
export async function POST(request: Request) {
  if (!requireAdminApi()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { kind } = (await request.json().catch(() => ({ kind: 'msp' }))) as { kind?: string };
  const brand = (await brandBySlug('inovo')) ?? (await defaultBrand());

  if (kind === 'client') {
    const answers: Answers = {};
    CLIENT_QUESTIONS.forEach((_, i) => {
      answers[i] = [2, 3, 1, 2, 3, 2, 1, 3][i % 8];
    });
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 45);
    const payload = buildClientPayload(
      {
        name: 'Marcus Ellery',
        email: 'mellery@harborline-aero.com',
        company: 'Harborline Aerospace Components',
        role: 'CIO',
        phone: '(555) 322-8810',
        employees: '200–499',
        provider: 'Our MSP / IT provider',
        frameworks: ['CMMC', 'NIST 800-171'],
        deadline: deadline.toISOString().slice(0, 10),
        timeline: 'Within 90 days',
        budget: 'I own the budget',
        sensitive: 'Yes',
      },
      answers,
      brand,
      VERTICALS[brand.vertical || 'cmmc'] || VERTICALS.cmmc,
      { qual: await qualificationRule() },
    );
    const lead = await insertLead(payload);
    return NextResponse.json({ ok: true, id: lead.id });
  }

  const answers: Answers = {};
  MSP_QUESTIONS.forEach((_, i) => {
    answers[i] = [1, 2, 3, 2, 1, 3, 2, 0][i % 8];
  });
  const payload = buildMspPayload(
    {
      name: 'Dana Whitfield',
      email: 'dana@northbridge-it.com',
      company: 'Northbridge IT Partners',
      role: 'Owner / CEO',
      seats: '1,500–5,000',
      phone: '(555) 201-4477',
    },
    answers,
    brand,
    { scoring: await activeScoring() },
  );
  const lead = await insertLead(payload);
  return NextResponse.json({ ok: true, id: lead.id });
}
