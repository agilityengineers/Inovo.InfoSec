import 'server-only';

/**
 * HubSpot: upsert the contact by email, then attach a note summarising the
 * assessment. The custom property names are the ones in the spec's property
 * map; they must exist in the portal or HubSpot rejects the write.
 */

import { withRetry } from '@/lib/integrations/retry';
import type { LeadPayload } from '@/lib/types';

const BASE = 'https://api.hubapi.com';

function splitName(full: string): { firstname: string; lastname: string } {
  const parts = (full || '').trim().split(/\s+/);
  return { firstname: parts[0] || '', lastname: parts.slice(1).join(' ') };
}

/** Maps a payload onto HubSpot contact properties, including the custom ones. */
export function contactProperties(payload: LeadPayload): Record<string, string> {
  const { firstname, lastname } = splitName(payload.contact.name);
  const props: Record<string, string> = {
    email: payload.contact.email,
    firstname,
    lastname,
    company: payload.contact.company,
    lead_source_brand: payload.brand.id,
  };
  if (payload.contact.role) props.jobtitle = payload.contact.role;
  if (payload.contact.phone) props.phone = payload.contact.phone;
  if (payload.contact.seatCount) props.msp_seat_count = String(payload.contact.seatCount);

  if (payload.assessment) {
    props.msp_assessment_score = String(payload.assessment.score);
    if (payload.assessment.level) props.msp_maturity_level = payload.assessment.level.name;
    for (const d of payload.assessment.domains ?? []) {
      props[`msp_domain_${d.id}_pct`] = String(d.pct);
    }
  }
  if (payload.vertical) props.assessment_vertical = payload.vertical.id;
  if (payload.qualification) {
    props.lead_qualification = payload.qualification.tier;
    props.lifecyclestage = payload.qualification.tier === 'HOT' ? 'salesqualifiedlead' : 'lead';
  } else if (payload.type === 'partner_inquiry') {
    props.lifecyclestage = 'lead';
  }
  return props;
}

function noteBody(payload: LeadPayload): string {
  const lines: string[] = [];
  lines.push(`${payload.type} via ${payload.brand.name}`);
  if (payload.assessment) {
    const level = payload.assessment.level
      ? `Level ${payload.assessment.level.n} ${payload.assessment.level.name}`
      : payload.assessment.tier;
    lines.push(`Score ${payload.assessment.score} · ${level}`);
    for (const d of payload.assessment.domains ?? payload.assessment.functions ?? []) {
      lines.push(`  ${d.name}: ${d.pct}% (${d.status})`);
    }
  }
  if (payload.qualification) {
    lines.push(`Qualification ${payload.qualification.tier} — ${payload.qualification.reasons.join(' · ')}`);
  }
  for (const r of payload.recommendations ?? []) {
    lines.push(`• ${r.title} → ${r.service}`);
  }
  return lines.join('\n');
}

async function hubspotFetch(path: string, token: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HubSpot ${path} responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<{ id: string }>;
}

export async function pushToHubspot(payload: LeadPayload): Promise<{ contactId: string }> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN is not set');
  const properties = contactProperties(payload);

  const contact = await withRetry(async () => {
    try {
      return await hubspotFetch('/crm/v3/objects/contacts', token, { properties });
    } catch (error) {
      // A 409 means the contact exists: update it by email instead.
      if (error instanceof Error && /409/.test(error.message)) {
        const res = await fetch(
          `${BASE}/crm/v3/objects/contacts/${encodeURIComponent(payload.contact.email)}?idProperty=email`,
          {
            method: 'PATCH',
            headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
            body: JSON.stringify({ properties }),
          },
        );
        if (!res.ok) throw new Error(`HubSpot contact update responded ${res.status}`);
        return (await res.json()) as { id: string };
      }
      throw error;
    }
  });

  await withRetry(() =>
    hubspotFetch('/crm/v3/objects/notes', token, {
      properties: { hs_note_body: noteBody(payload), hs_timestamp: payload.submittedAt },
      associations: [
        {
          to: { id: contact.id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
        },
      ],
    }),
  );

  return { contactId: contact.id };
}
