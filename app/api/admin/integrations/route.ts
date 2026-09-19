import { z } from 'zod';
import { adminRoute } from '@/lib/admin-api';
import { getSetting, saveSetting } from '@/lib/repo';

export const dynamic = 'force-dynamic';

const schema = z.object({
  hubspotPortal: z.string().default(''),
  zapierHook: z.string().default(''),
});

export const PATCH = adminRoute(async (body) => {
  const value = schema.parse(body);
  await saveSetting('integrations', value);
  return { ok: true, integrations: value };
});

export const GET = adminRoute(async () => ({
  integrations: await getSetting('integrations', { hubspotPortal: '', zapierHook: '' }),
}));
