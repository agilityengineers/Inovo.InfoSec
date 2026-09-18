'use client';

/**
 * View model for the MSP admin screens (Leads · Integrations · Scoring ·
 * Brand & CTA config).
 *
 * The prototype kept all of this in `localStorage`; here every edit goes
 * through `/api/admin/*`, and saving scoring writes a new version rather than
 * mutating the live one.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { DOMAINS, QUESTIONS, DEFAULT_SCORING } from '@/lib/data/msp';
import { SEED_BRANDS } from '@/lib/data/brands';
import { toBrandView } from '@/lib/brand-context';
import type { Brand, Econ, Scoring } from '@/lib/types';
import type { MspAdminVals, IntegrationLogEntry, LeadRow } from '@/lib/view-models/types';

export type AdminLead = {
  id: string;
  type: string;
  name: string | null;
  company: string | null;
  score: number | null;
  tier: string | null;
  qualification: string | null;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type MspAdminData = {
  leads: AdminLead[];
  events: { target: string; status: string; message: string; createdAt: string }[];
  scoring: Scoring;
  brands: Brand[];
  integrations: { hubspotPortal: string; zapierHook: string };
};

const TYPE_META: Record<string, [string, string]> = {
  assessment_lead: ['Assessment', '#1f7a3a'],
  partner_inquiry: ['Partner', '#0F4C81'],
};

const TARGET_COLOR: Record<string, string> = {
  HubSpot: '#c25a3a',
  Zapier: '#c23a00',
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

export function useMspAdminVals(data: MspAdminData): MspAdminVals {
  const [tabName, setTabName] = useState<'leads' | 'integrations' | 'scoring' | 'config'>('leads');
  const [selectedId, setSelectedId] = useState<string | null>(data.leads[0]?.id ?? null);
  const [scoring, setScoring] = useState<Scoring>(data.scoring);
  const [brands, setBrands] = useState<Brand[]>(data.brands);
  const [integrations, setIntegrations] = useState(data.integrations);
  const [log, setLog] = useState<IntegrationLogEntry[]>(
    data.events.map((e) => ({
      when: new Date(e.createdAt).toLocaleTimeString(),
      target: e.target,
      msg: e.message,
      color: TARGET_COLOR[e.target] ?? '#555',
    })),
  );

  const byId = (id: string) => brands.find((b) => b.id === id) ?? SEED_BRANDS[id];
  const inovo = byId('inovo');
  const partner = byId('partner');
  const brand = useMemo(() => toBrandView(inovo), [inovo]);

  const selected = data.leads.find((l) => l.id === selectedId) ?? data.leads[0] ?? null;

  const note = useCallback((target: string, msg: string) => {
    setLog((prev) =>
      [
        { when: new Date().toLocaleTimeString(), target, msg, color: TARGET_COLOR[target] ?? '#555' },
        ...prev,
      ].slice(0, 30),
    );
  }, []);

  const push = useCallback(
    async (target: 'hubspot' | 'zapier') => {
      if (!selected) return;
      const label = target === 'hubspot' ? 'HubSpot' : 'Zapier';
      try {
        const res = await fetch(`/api/admin/leads/${selected.id}/push`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target }),
        });
        const json = (await res.json()) as { results?: { target: string; status: string; message: string }[] };
        for (const r of json.results ?? []) note(r.target, `${r.status}: ${r.message}`);
      } catch (error) {
        note(label, `failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [selected, note],
  );

  const saveScoring = useCallback(async (next: Scoring) => {
    setScoring(next);
    try {
      await patch('/api/admin/scoring', next);
    } catch {
      /* the field keeps the typed value; the next save retries */
    }
  }, []);

  const saveBrand = useCallback(async (next: Brand) => {
    setBrands((prev) => prev.map((b) => (b.id === next.id ? next : b)));
    try {
      await patch('/api/admin/brands', next);
    } catch {
      /* as above */
    }
  }, []);

  const leadRows: LeadRow[] = data.leads.map((l) => {
    const payload = l.payload as {
      type: string;
      contact: { name: string; company: string; seatCount?: string };
      brand: { name: string };
      assessment: { score: number; level?: { n: number; name: string } } | null;
      partner?: { interest?: string; clientsUnderManagement?: string };
    };
    const meta = TYPE_META[l.type] ?? ['Lead', '#555'];
    return {
      id: l.id,
      name: payload.contact.name,
      company: payload.contact.company,
      typeLabel: meta[0],
      typeBg: meta[1],
      meta: payload.assessment
        ? `Score ${payload.assessment.score} · Level ${payload.assessment.level?.n} ${payload.assessment.level?.name} · ${payload.contact.seatCount} seats · via ${payload.brand.name}`
        : `${payload.partner?.interest || 'Interest not stated'} · ${payload.partner?.clientsUnderManagement || '?'} clients`,
      when: new Date(l.createdAt).toLocaleString(),
      bg: selected && selected.id === l.id ? '#f0f4ff' : '#fff',
      select: () => setSelectedId(l.id),
    };
  });

  const tabs = ['leads', 'integrations', 'scoring', 'config'] as const;
  const tab = Object.fromEntries(tabs.map((t) => [t, () => setTabName(t)])) as MspAdminVals['tab'];
  const tabBg = Object.fromEntries(
    tabs.map((t) => [t, tabName === t ? '#fff' : 'transparent']),
  ) as MspAdminVals['tabBg'];
  const tabColor = Object.fromEntries(
    tabs.map((t) => [t, tabName === t ? '#111' : '#555']),
  ) as MspAdminVals['tabColor'];
  const adminIs = Object.fromEntries(tabs.map((t) => [t, tabName === t])) as MspAdminVals['adminIs'];

  return {
    brand,
    partnerName: partner.name,
    qTotal: QUESTIONS.length,
    econ: inovo.econ,
    onEconChange: (e) => saveBrand({ ...inovo, econ: { ...inovo.econ, [e.target.name]: Number(e.target.value) } as Econ }),
    setBrand: { inovo: () => {}, partner: () => {} },

    leadCount: data.leads.length,
    noLeads: data.leads.length === 0,
    leadRows,
    selectedLabel: selected ? `${selected.type} · ${selected.id}` : 'select a lead',
    noSelected: !selected,
    payloadJson: selected
      ? JSON.stringify(selected.payload, null, 2)
      : '// No lead selected.\n// Complete the assessment or seed a sample lead to see the structured payload.',
    pushHubspot: () => void push('hubspot'),
    pushZapier: () => void push('zapier'),
    integrationLog: log,
    noLog: log.length === 0,

    tab,
    tabBg,
    tabColor,
    adminIs,

    cfg: {
      hubspotPortal: integrations.hubspotPortal,
      zapierHook: integrations.zapierHook,
      gapBelow: scoring.gapBelow,
      watchBelow: scoring.watchBelow,
    },
    onCfgChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (name === 'gapBelow' || name === 'watchBelow') {
        void saveScoring({ ...scoring, [name]: Number(value) });
      } else {
        const next = { ...integrations, [name]: value };
        setIntegrations(next);
        void patch('/api/admin/integrations', next).catch(() => {});
      }
    },

    weightRows: DOMAINS.map((d) => ({ id: d.id, name: d.name, weight: scoring.weights[d.id] })),
    onWeightChange: (e) =>
      void saveScoring({
        ...scoring,
        weights: { ...scoring.weights, [e.target.name]: Number(e.target.value) },
      }),
    thresholdRows: scoring.levels.map((l) => ({ ...l, locked: l.n === 1 })),
    onThresholdChange: (e) =>
      void saveScoring({
        ...scoring,
        levels: scoring.levels.map((l) =>
          l.n === Number(e.target.name) ? { ...l, min: Number(e.target.value) } : l,
        ),
      }),
    resetScoring: () => void saveScoring(DEFAULT_SCORING),
    questionBank: QUESTIONS.map((q, i) => ({
      n: i + 1,
      text: q.text,
      domainName: DOMAINS.find((d) => d.id === q.d)!.name,
      options: q.options,
    })),

    cfgBrands: {
      inovo: { ...inovo, logo: inovo.logo ?? '' },
      partner: { ...partner, logo: partner.logo ?? '' },
    },
    onBrandCfg: (e) => {
      const target = e.target as HTMLInputElement;
      const [id, key] = target.name.split('.');
      const value = target.type === 'checkbox' ? target.checked : target.value;
      void saveBrand({ ...byId(id), [key]: value });
    },
    resetBrands: () => {
      for (const seed of Object.values(SEED_BRANDS)) void saveBrand(seed);
    },
    brandJson: JSON.stringify(inovo, null, 2),
    seedDemoLead: async () => {
      await fetch('/api/admin/seed-lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'msp' }) });
      window.location.reload();
    },
  };
}
