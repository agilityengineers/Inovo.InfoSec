import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';
import { brandBySlug, getLead, listBrands } from '@/lib/repo';
import { fanOut } from '@/lib/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Re-runs the fan-out for one lead, from the admin's lead detail pane. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!requireAdminApi()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const brands = await listBrands();
  const brand =
    brands.find((b) => b.id === lead.brandId) ?? (await brandBySlug('inovo')) ?? brands[0];

  const results = await fanOut(lead.id, lead.payload, brand);
  return NextResponse.json({ ok: true, results });
}
