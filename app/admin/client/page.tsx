import { requireAdmin } from '@/lib/auth';
import ClientAdminScreen from '@/components/admin/ClientAdminScreen';
import { listBrands, listLeads, qualificationRule } from '@/lib/repo';
import type { ClientAdminData, ClientAdminLead } from '@/lib/view-models/useClientAdminVals';

export const dynamic = 'force-dynamic';

/** `/admin/client` — qualified leads, the qualification rule, vertical per brand. */
export default async function Page() {
  requireAdmin();

  const [leads, qual, brands] = await Promise.all([
    listLeads({ type: 'client_assessment_lead', limit: 100 }),
    qualificationRule(),
    listBrands(),
  ]);

  const data: ClientAdminData = {
    leads: leads.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      payload: l.payload as unknown as ClientAdminLead['payload'],
    })),
    qual,
    brands,
    brandVerticals: Object.fromEntries(brands.map((b) => [b.id, b.vertical ?? 'cmmc'])),
  };

  return <ClientAdminScreen data={data} />;
}
