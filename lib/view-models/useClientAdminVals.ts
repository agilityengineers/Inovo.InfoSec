'use client';

/**
 * View model for the client-assessment admin: qualified leads with their
 * HOT/WARM/NURTURE badge and reasons, the editable qualification rule, and the
 * per-brand vertical and routing summary.
 *
 * Badges recalculate live as the rule's four numbers change, which is what the
 * approved screen promises — so `qualify()` is re-run in the browser against
 * the edited rule rather than reading the tier stored on the lead.
 */

import { useCallback, useState } from 'react';
import { VERTICALS, DEFAULT_QUAL } from '@/lib/data/client';
import { qualify } from '@/lib/scoring/client';
import type { Brand, ClientLeadForm, Qualification } from '@/lib/types';
import type { ClientAdminVals, LeadRow } from '@/lib/view-models/types';

export type ClientAdminLead = {
  id: string;
  createdAt: string;
  payload: {
    contact: { name: string; company: string; role: string | null };
    brand: { name: string };
    vertical: { label: string };
    assessment: { score: number; tier?: string };
    qualification: {
      tier: string;
      reasons: string[];
      employees: string;
      deadline: string | null;
      timeline: string;
      budgetAuthority: string;
    };
  };
};

export type ClientAdminData = {
  leads: ClientAdminLead[];
  qual: Qualification;
  brands: Brand[];
  brandVerticals: Record<string, string>;
};

const QUAL_COLOR: Record<string, string> = {
  HOT: '#b3121a',
  WARM: '#b7791f',
  NURTURE: '#4a5568',
};

async function patch(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} responded ${res.status}`);
  return res.json();
}

export function useClientAdminVals(data: ClientAdminData): ClientAdminVals {
  const [qual, setQual] = useState<Qualification>(data.qual ?? DEFAULT_QUAL);
  const [brandVerticals, setBrandVerticals] = useState(data.brandVerticals);
  const [selectedId, setSelectedId] = useState<string | null>(data.leads[0]?.id ?? null);

  const selected = data.leads.find((l) => l.id === selectedId) ?? data.leads[0] ?? null;

  const recompute = useCallback(
    (lead: ClientAdminLead) =>
      qualify(
        lead.payload.assessment.score,
        {
          deadline: lead.payload.qualification.deadline ?? undefined,
          timeline: lead.payload.qualification.timeline,
          budget: lead.payload.qualification.budgetAuthority,
        } as Partial<ClientLeadForm>,
        qual,
      ),
    [qual],
  );

  const leadRows: LeadRow[] = data.leads.map((l) => {
    const q = recompute(l);
    const p = l.payload;
    return {
      id: l.id,
      name: p.contact.name,
      company: p.contact.company,
      role: p.contact.role ?? '',
      qual: q.tier,
      qualBg: QUAL_COLOR[q.tier],
      reasons: q.reasons.join(' · '),
      meta: `Score ${p.assessment.score} · ${p.assessment.tier} · ${p.vertical.label} · ${p.qualification.employees} employees · via ${p.brand.name}`,
      when: new Date(l.createdAt).toLocaleString(),
      bg: selected && selected.id === l.id ? '#f0f4ff' : '#fff',
      select: () => setSelectedId(l.id),
    };
  });

  return {
    verticalOptions: Object.values(VERTICALS).map((v) => ({ id: v.id, label: v.label })),
    leadCount: data.leads.length,
    noLeads: data.leads.length === 0,
    leadRows,
    selectedLabel: selected ? `— ${selected.id}` : '',
    payloadJson: selected
      ? JSON.stringify(
          { ...selected.payload, qualification: { ...selected.payload.qualification, ...recompute(selected) } },
          null,
          2,
        )
      : '// No lead selected.',
    seedDemoLead: async () => {
      await fetch('/api/admin/seed-lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'client' }),
      });
      window.location.reload();
    },
    qual,
    onQualChange: (e) => {
      const next = { ...qual, [e.target.name]: Number(e.target.value) };
      setQual(next);
      void patch('/api/admin/qualification', next).catch(() => {});
    },
    brandVerticalRows: data.brands.map((b) => ({
      id: b.id,
      name: b.name,
      verticalId: brandVerticals[b.id] ?? b.vertical ?? 'cmmc',
      routing:
        b.routing.model === 'co-delivery'
          ? `Co-delivery → ${b.routing.notify.join(' + ')}`
          : `Direct → ${b.routing.notify.join(', ')}`,
    })),
    onBrandVertical: (e) => {
      const { name, value } = e.target;
      setBrandVerticals((prev) => ({ ...prev, [name]: value }));
      const brand = data.brands.find((b) => b.id === name);
      if (brand) void patch('/api/admin/brands', { ...brand, vertical: value }).catch(() => {});
    },
  };
}
