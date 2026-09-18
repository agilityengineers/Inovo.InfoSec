import { NextResponse } from 'next/server';
import { brandBySlug, defaultBrand, qualificationRule } from '@/lib/repo';
import { buildClientPayload } from '@/lib/payload';
import { renderReportPdf } from '@/lib/pdf/report';
import { VERTICALS } from '@/lib/data/client';
import type { Answers } from '@/lib/scoring/answers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The playbook / report download on the client report. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = (await brandBySlug(url.searchParams.get('brand') || 'inovo')) ?? (await defaultBrand());

  let answers: Answers = {};
  try {
    answers = JSON.parse(url.searchParams.get('answers') || '{}') as Answers;
  } catch {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });
  }

  const payload = buildClientPayload(
    {
      name: url.searchParams.get('name') || '',
      company: url.searchParams.get('company') || '',
      email: '',
      role: '',
      phone: '',
      employees: '',
      provider: '',
      frameworks: [],
      deadline: '',
      timeline: '',
      budget: '',
      sensitive: '',
    },
    answers,
    brand,
    VERTICALS[brand.vertical || 'cmmc'] || VERTICALS.cmmc,
    { qual: await qualificationRule() },
  );

  const pdf = await renderReportPdf(payload, brand);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="readiness-report.pdf"',
    },
  });
}
