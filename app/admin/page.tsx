import { requireAdmin } from '@/lib/auth';
import MspAdminScreen from '@/components/admin/MspAdminScreen';
import { activeScoring, getSetting, listBrands, listIntegrationEvents, listLeads } from '@/lib/repo';
import type { MspAdminData } from '@/lib/view-models/useMspAdminVals';

export const dynamic = 'force-dynamic';

/** `/admin` — Leads · Integrations · Scoring · Brand & CTA config. */
export default async function Page() {
  requireAdmin();

  const [leads, events, scoring, brands, integrations] = await Promise.all([
    listLeads({ limit: 100 }),
    listIntegrationEvents(30),
    activeScoring(),
    listBrands(),
    getSetting<{ hubspotPortal?: string; zapierHook?: string }>('integrations', {}),
  ]);

  const data: MspAdminData = {
    leads: leads
      .filter((l) => l.type !== 'client_assessment_lead')
      .map((l) => ({
        id: l.id,
        type: l.type,
        name: l.name,
        company: l.company,
        score: l.score,
        tier: l.tier,
        qualification: l.qualification,
        createdAt: l.createdAt.toISOString(),
        payload: l.payload as unknown as Record<string, unknown>,
      })),
    events: events.map((e) => ({
      target: e.target,
      status: e.status,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
    scoring,
    brands,
    integrations: {
      hubspotPortal: integrations.hubspotPortal ?? '',
      zapierHook: integrations.zapierHook ?? '',
    },
  };

  return <MspAdminScreen data={data} />;
}
