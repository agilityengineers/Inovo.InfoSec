import { NextResponse } from 'next/server';
import { brandBySlug, defaultBrand, activeScoring } from '@/lib/repo';
import { buildMspPayload } from '@/lib/payload';
import { renderReportPdf } from '@/lib/pdf/report';
import type { Answers } from '@/lib/scoring/answers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The report's download button. Answers come from the query; nothing is stored. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = (await brandBySlug(url.searchParams.get('brand') || 'inovo')) ?? (await defaultBrand());

  let answers: Answers = {};
  try {
    answers = JSON.parse(url.searchParams.get('answers') || '{}') as Answers;
  } catch {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });
  }

  const payload = buildMspPayload(
    {
      name: url.searchParams.get('name') || '',
      company: url.searchParams.get('company') || '',
      email: '',
      role: '',
      seats: '',
      phone: '',
    },
    answers,
    brand,
    { scoring: await activeScoring() },
  );

  const pdf = await renderReportPdf(payload, brand);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="security-posture-report.pdf"',
    },
  });
}
