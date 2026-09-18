import 'server-only';

/**
 * Lead fan-out.
 *
 * Runs after the lead is persisted, so a failing integration can never cost us
 * the lead itself. Each target is behind a feature flag plus its key, each
 * retries with backoff, and every outcome — including "skipped, not
 * configured" — lands in `integration_events`, which is what the admin's
 * integration log shows.
 */

import { pushToHubspot } from '@/lib/integrations/hubspot';
import { pushToZapier } from '@/lib/integrations/zapier';
import { sendProspectReport, sendInternalAlert } from '@/lib/integrations/email';
import { errorMessage } from '@/lib/integrations/retry';
import { getSetting, logIntegrationEvent } from '@/lib/repo';
import type { Brand, LeadPayload } from '@/lib/types';

const enabled = (name: string) => (process.env[`INTEGRATION_${name}`] ?? 'on').toLowerCase() !== 'off';

export type FanOutResult = { target: string; status: 'ok' | 'failed' | 'skipped'; message: string };

async function run(
  target: string,
  leadId: string,
  task: () => Promise<string>,
): Promise<FanOutResult> {
  try {
    const message = await task();
    await logIntegrationEvent({ leadId, target, status: 'ok', message });
    return { target, status: 'ok', message };
  } catch (error) {
    const message = errorMessage(error);
    await logIntegrationEvent({ leadId, target, status: 'failed', message });
    return { target, status: 'failed', message };
  }
}

async function skip(target: string, leadId: string, why: string): Promise<FanOutResult> {
  await logIntegrationEvent({ leadId, target, status: 'skipped', message: why });
  return { target, status: 'skipped', message: why };
}

export async function fanOut(
  leadId: string,
  payload: LeadPayload,
  brand: Brand,
): Promise<FanOutResult[]> {
  const settings = await getSetting<{ hubspotPortal?: string; zapierHook?: string }>('integrations', {});
  const results: FanOutResult[] = [];

  // HubSpot — upsert the contact, then attach the summary note.
  if (!enabled('HUBSPOT')) {
    results.push(await skip('HubSpot', leadId, 'disabled by INTEGRATION_HUBSPOT=off'));
  } else if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    results.push(await skip('HubSpot', leadId, 'no HUBSPOT_ACCESS_TOKEN configured'));
  } else {
    results.push(
      await run('HubSpot', leadId, async () => {
        const { contactId } = await pushToHubspot(payload);
        const portal = settings.hubspotPortal ? ` → portal ${settings.hubspotPortal}` : '';
        return `contact ${payload.contact.email} upserted as ${contactId}${portal}`;
      }),
    );
  }

  // Zapier — the whole payload to the Catch Hook.
  const hook = settings.zapierHook || process.env.ZAPIER_HOOK_URL || '';
  if (!enabled('ZAPIER')) {
    results.push(await skip('Zapier', leadId, 'disabled by INTEGRATION_ZAPIER=off'));
  } else if (!hook) {
    results.push(await skip('Zapier', leadId, 'no Catch Hook URL configured'));
  } else {
    results.push(
      await run('Zapier', leadId, async () => {
        const { bytes } = await pushToZapier(payload, hook);
        return `POSTed ${bytes} bytes JSON → ${hook}`;
      }),
    );
  }

  // Email — the report to the prospect, the payload to the routing list.
  if (!enabled('EMAIL')) {
    results.push(await skip('Email', leadId, 'disabled by INTEGRATION_EMAIL=off'));
  } else if (!process.env.RESEND_API_KEY) {
    results.push(await skip('Email', leadId, 'no RESEND_API_KEY configured'));
  } else {
    if (payload.contact.email && payload.assessment) {
      results.push(
        await run('Email', leadId, async () => {
          await sendProspectReport(payload, brand);
          return `report sent to ${payload.contact.email}`;
        }),
      );
    }
    results.push(
      await run('Email', leadId, async () => {
        await sendInternalAlert(payload, brand);
        return `alert sent to ${(payload.routing?.notify ?? brand.routing.notify).join(', ')}`;
      }),
    );
  }

  return results;
}
