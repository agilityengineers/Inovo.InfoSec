import { z } from 'zod';
import { adminRoute } from '@/lib/admin-api';
import { listBrands, saveBrand } from '@/lib/repo';
import { contrastOnWhite, CONTRAST_FLOOR } from '@/lib/color';

export const dynamic = 'force-dynamic';

const schema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  legalName: z.string(),
  tagline: z.string(),
  logo: z.string().nullable(),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Primary must be a six-digit hex colour'),
  phone: z.string(),
  incidentPhone: z.string(),
  email: z.string(),
  address: z.string(),
  ctaDirectLabel: z.string(),
  ctaDirectUrl: z.string(),
  ctaPartnerUrl: z.string().optional(),
  reportCtaLabel: z.string(),
  poweredBy: z.boolean(),
  showPartnerCta: z.boolean().optional(),
  vertical: z.string().optional(),
  hostnames: z.array(z.string()),
  routing: z.object({
    model: z.enum(['direct', 'co-delivery']),
    notify: z.array(z.string()),
    owner: z.string().optional(),
  }),
  econ: z.object({ marginPct: z.number(), referralPct: z.number(), minClients: z.number() }),
});

export const PATCH = adminRoute(async (body) => {
  const brand = schema.parse(body);
  await saveBrand(brand);

  // Surfaced in the admin: a primary this light makes white button text unreadable.
  const contrast = contrastOnWhite(brand.primary);
  return {
    ok: true,
    contrast,
    contrastWarning: contrast < CONTRAST_FLOOR
      ? `Contrast ${contrast}:1 on white is below the ${CONTRAST_FLOOR}:1 minimum`
      : null,
  };
});

export const GET = adminRoute(async () => ({ brands: await listBrands() }));
