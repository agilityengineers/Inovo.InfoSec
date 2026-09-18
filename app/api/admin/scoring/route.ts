import { z } from 'zod';
import { adminRoute } from '@/lib/admin-api';
import { activeScoring, saveScoring } from '@/lib/repo';

export const dynamic = 'force-dynamic';

const schema = z.object({
  weights: z.record(z.string(), z.number()),
  levels: z.array(z.object({ n: z.number(), name: z.string(), min: z.number() })),
  gapBelow: z.number(),
  watchBelow: z.number(),
});

/** Each save writes a new version; the previous one stays for re-scoring. */
export const PATCH = adminRoute(async (body) => {
  const scoring = schema.parse(body);
  await saveScoring(scoring);
  return { ok: true, scoring: await activeScoring() };
});
