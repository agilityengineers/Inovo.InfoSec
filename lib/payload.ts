/**
 * Submission payload builders — ports of `buildPayload()` in both reference
 * logic files. The client posts one of these to `/api/leads`; the server
 * persists it and fans out to HubSpot, Zapier and email.
 */

import { QUESTIONS as MSP_QUESTIONS, MSP_ASSESSMENT_VERSION } from '@/lib/data/msp';
import { QUESTIONS as CLIENT_QUESTIONS, CLIENT_ASSESSMENT_VERSION } from '@/lib/data/client';
import { score as scoreMsp } from '@/lib/scoring/msp';
import { score as scoreClient, qualify, urgencyDays, tok } from '@/lib/scoring/client';
import type { Answers } from '@/lib/scoring/answers';
import type {
  Brand,
  ClientLeadForm,
  Econ,
  LeadPayload,
  MspLeadForm,
  PartnerForm,
  Qualification,
  Scoring,
  Utm,
  Vertical,
} from '@/lib/types';

export type Source = { host: string; utm: Utm };

export function buildMspPayload(
  lead: MspLeadForm,
  answers: Answers,
  brand: Brand,
  opts: { scoring?: Scoring; source?: Source; type?: 'assessment_lead' } = {},
): LeadPayload {
  const r = scoreMsp(answers, opts.scoring);
  return {
    type: opts.type || 'assessment_lead',
    submittedAt: new Date().toISOString(),
    brand: { id: brand.id, name: brand.name },
    source: {
      host: opts.source?.host ?? brand.hostnames[0] ?? 'assess.inovois.com',
      utm: opts.source?.utm ?? null,
      assessmentVersion: MSP_ASSESSMENT_VERSION,
    },
    contact: {
      name: lead.name,
      email: lead.email,
      company: lead.company,
      role: lead.role,
      seatCount: lead.seats,
      phone: lead.phone,
    },
    assessment: {
      score: r.score,
      level: r.level,
      domains: r.doms.map((d) => ({
        id: d.id,
        name: d.name,
        points: d.raw,
        max: d.max,
        pct: d.pct,
        weight: d.weight,
        status: d.status,
      })),
      answers: MSP_QUESTIONS.map((q, i) => ({
        id: 'q' + (i + 1),
        domain: q.d,
        question: q.text,
        answer: answers[i] != null ? q.options[answers[i] as number].label : null,
        points: answers[i] != null ? q.options[answers[i] as number].points : null,
      })),
    },
    recommendations: r.recs.map((x) => ({
      domain: x.domainId,
      status: x.status,
      title: x.title,
      service: x.service,
    })),
    routing: brand.routing,
    integrations: {
      hubspot: { status: 'pending', endpoint: 'POST /crm/v3/objects/contacts' },
      zapier: { status: 'pending' },
    },
  };
}

export function buildPartnerPayload(
  form: PartnerForm,
  brand: Brand,
  econ: Econ,
  source?: Source,
): LeadPayload {
  return {
    type: 'partner_inquiry',
    submittedAt: new Date().toISOString(),
    brand: { id: brand.id, name: brand.name },
    source: {
      host: source?.host ?? brand.hostnames[0] ?? 'assess.inovois.com',
      utm: source?.utm ?? null,
      assessmentVersion: MSP_ASSESSMENT_VERSION,
    },
    contact: {
      name: form.name,
      email: form.email,
      company: form.company,
      role: null,
      seatCount: null,
      phone: null,
    },
    partner: {
      clientsUnderManagement: form.clients,
      interest: form.interest,
      industries: form.industries,
      proposedEconomics: econ,
    },
    assessment: null,
    routing: brand.routing,
    integrations: {
      hubspot: { status: 'pending', lifecyclestage: 'partner_lead' },
      zapier: { status: 'pending' },
    },
  };
}

export function buildClientPayload(
  lead: ClientLeadForm,
  answers: Answers,
  brand: Brand,
  v: Vertical,
  opts: { qual?: Qualification; source?: Source } = {},
): LeadPayload {
  const r = scoreClient(answers, v);
  const q = qualify(r.score, lead, opts.qual);

  const routing =
    brand.routing.model === 'co-delivery'
      ? { ...brand.routing, owner: brand.routing.owner ?? brand.name }
      : { ...brand.routing, owner: brand.routing.owner ?? 'Inovo Infosec' };

  return {
    type: 'client_assessment_lead',
    submittedAt: new Date().toISOString(),
    brand: { id: brand.id, name: brand.name },
    vertical: { id: v.id, label: v.label, framework: v.framework },
    source: {
      host: opts.source?.host ?? brand.hostnames[0] ?? 'assess.inovois.com',
      utm: opts.source?.utm ?? null,
      assessmentVersion: CLIENT_ASSESSMENT_VERSION,
    },
    contact: {
      name: lead.name,
      email: lead.email,
      company: lead.company,
      role: lead.role,
      phone: lead.phone,
    },
    qualification: {
      tier: q.tier,
      reasons: q.reasons,
      urgencyDays: urgencyDays(lead),
      employees: lead.employees,
      currentProvider: lead.provider,
      frameworksRequired: lead.frameworks,
      deadline: lead.deadline || null,
      timeline: lead.timeline,
      budgetAuthority: lead.budget,
      handlesSensitiveData: lead.sensitive,
    },
    assessment: {
      score: r.score,
      tier: r.tier.name,
      functions: r.fns.map((f) => ({
        id: f.id,
        name: f.name,
        points: f.raw,
        max: f.max,
        pct: f.pct,
        status: f.status,
      })),
      answers: CLIENT_QUESTIONS.map((question, i) => ({
        id: 'q' + (i + 1),
        function: question.f,
        question: tok(question.text, v),
        answer: answers[i] != null ? question.options[answers[i] as number].label : null,
        points: answers[i] != null ? question.options[answers[i] as number].points : null,
      })),
    },
    recommendations: r.recs.map((x) => ({
      function: x.fnId,
      status: x.status,
      title: x.title,
      service: x.service,
    })),
    playbook: { title: v.playbook, status: 'pending' },
    routing,
    integrations: {
      hubspot: { status: 'pending', lifecyclestage: q.tier === 'HOT' ? 'salesqualifiedlead' : 'lead' },
      zapier: { status: 'pending' },
    },
  };
}
