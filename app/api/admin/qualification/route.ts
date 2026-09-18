import { z } from 'zod';
import { adminRoute } from '@/lib/admin-api';
import { qualificationRule, saveQualificationRule } from '@/lib/repo';

export const dynamic = 'force-dynamic';

const schema = z.object({
  hotScoreBelow: z.number(),
  hotDays: z.number(),
  warmScoreBelow: z.number(),
  warmDays: z.number(),
});

export const PATCH = adminRoute(async (body) => {
  await saveQualificationRule(schema.parse(body));
  return { ok: true, qual: await qualificationRule() };
});
