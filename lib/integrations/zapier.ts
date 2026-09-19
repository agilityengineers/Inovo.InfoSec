import 'server-only';

/** Zapier: POST the whole payload to the Catch Hook URL from config. */

import { withRetry } from '@/lib/integrations/retry';
import type { LeadPayload } from '@/lib/types';

export async function pushToZapier(payload: LeadPayload, hookUrl: string): Promise<{ bytes: number }> {
  if (!hookUrl) throw new Error('No Zapier Catch Hook URL configured');
  const body = JSON.stringify(payload);
  await withRetry(async () => {
    const res = await fetch(hookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (!res.ok) throw new Error(`Zapier hook responded ${res.status}`);
  });
  return { bytes: body.length };
}
