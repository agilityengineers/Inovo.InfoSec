import { describe, expect, it } from 'vitest';
import { buildMspPayload, buildClientPayload, buildPartnerPayload } from '@/lib/payload';
import { contactProperties } from '@/lib/integrations/hubspot';
import { SEED_BRANDS } from '@/lib/data/brands';
import { QUESTIONS as MSP_QUESTIONS } from '@/lib/data/msp';
import { QUESTIONS as CLIENT_QUESTIONS, VERTICALS } from '@/lib/data/client';
import type { Answers } from '@/lib/scoring/answers';

const inovo = SEED_BRANDS.inovo;
const partner = SEED_BRANDS.partner;

const mspAnswers: Answers = {};
MSP_QUESTIONS.forEach((_, i) => {
  mspAnswers[i] = [1, 2, 3, 2, 1, 3, 2, 0][i % 8];
});

const clientAnswers: Answers = {};
CLIENT_QUESTIONS.forEach((_, i) => {
  clientAnswers[i] = [2, 3, 1, 2, 3, 2, 1, 3][i % 8];
});

const lead = {
  name: 'Dana Whitfield',
  email: 'dana@northbridge-it.com',
  company: 'Northbridge IT Partners',
  role: 'Owner / CEO',
  seats: '1,500–5,000',
  phone: '(555) 201-4477',
};

describe('MSP payload', () => {
  const payload = buildMspPayload(lead, mspAnswers, inovo);

  it('carries the contact, the brand and the assessment version', () => {
    expect(payload.type).toBe('assessment_lead');
    expect(payload.brand).toEqual({ id: 'inovo', name: 'Inovo Infosec' });
    expect(payload.source?.assessmentVersion).toBe('1.0');
    expect(payload.contact).toMatchObject({ email: lead.email, seatCount: lead.seats });
  });

  it('records all 24 answers with their label and points', () => {
    expect(payload.assessment?.answers).toHaveLength(24);
    const first = payload.assessment!.answers[0];
    expect(first.id).toBe('q1');
    expect(first.domain).toBe('tooling');
    expect(first.answer).toBe(MSP_QUESTIONS[0].options[mspAnswers[0]!].label);
    expect(first.points).toBe(MSP_QUESTIONS[0].options[mspAnswers[0]!].points);
  });

  it('records a null answer for an unanswered question rather than dropping it', () => {
    const partial = buildMspPayload(lead, { 0: 1 }, inovo);
    expect(partial.assessment?.answers).toHaveLength(24);
    expect(partial.assessment?.answers[5]).toMatchObject({ answer: null, points: null });
  });

  it('captures UTM parameters and the host', () => {
    const withUtm = buildMspPayload(lead, mspAnswers, inovo, {
      source: { host: 'assess.inovois.com', utm: { utm_source: 'linkedin', utm_campaign: 'q3' } },
    });
    expect(withUtm.source).toMatchObject({
      host: 'assess.inovois.com',
      utm: { utm_source: 'linkedin', utm_campaign: 'q3' },
    });
  });
});

describe('client payload', () => {
  const payload = buildClientPayload(
    {
      name: 'Marcus Ellery',
      email: 'mellery@harborline-aero.com',
      company: 'Harborline Aerospace',
      role: 'CIO',
      phone: '(555) 322-8810',
      employees: '200–499',
      provider: 'Our MSP / IT provider',
      frameworks: ['CMMC', 'NIST 800-171'],
      deadline: '',
      timeline: 'Within 90 days',
      budget: 'I own the budget',
      sensitive: 'Yes',
    },
    clientAnswers,
    inovo,
    VERTICALS.cmmc,
  );

  it('includes the vertical, the qualification and the playbook', () => {
    expect(payload.type).toBe('client_assessment_lead');
    expect(payload.vertical).toEqual({
      id: 'cmmc',
      label: 'Defense / CMMC',
      framework: 'CMMC Level 2 / NIST SP 800-171',
    });
    expect(payload.qualification?.tier).toBeDefined();
    expect(payload.playbook?.title).toBe(VERTICALS.cmmc.playbook);
  });

  it('substitutes vertical tokens into the stored question text', () => {
    for (const answer of payload.assessment!.answers) {
      expect(answer.question).not.toMatch(/\{(FW|DATA|AUD|SYSTEMS)\}/);
    }
  });

  it('routes direct for Inovo and co-delivery for a partner', () => {
    expect(payload.routing).toMatchObject({ model: 'direct', owner: 'Inovo Infosec' });

    const viaPartner = buildClientPayload(
      {
        name: 'Marcus Ellery',
        email: 'mellery@harborline-aero.com',
        company: 'Harborline Aerospace',
        role: 'CIO',
        phone: '(555) 322-8810',
        employees: '200–499',
        provider: 'Our MSP / IT provider',
        frameworks: [],
        deadline: '',
        timeline: 'Within 90 days',
        budget: 'I own the budget',
        sensitive: 'Yes',
      },
      clientAnswers,
      partner,
      VERTICALS.hipaa,
    );
    expect(viaPartner.routing).toMatchObject({ model: 'co-delivery', owner: partner.name });
    expect(viaPartner.routing?.notify).toContain('sales@inovois.com');
  });
});

describe('partner inquiry payload', () => {
  it('carries the proposed economics and no assessment', () => {
    const payload = buildPartnerPayload(
      {
        name: 'Alex Reed',
        company: 'Reed Managed IT',
        email: 'alex@reedmanagedit.com',
        clients: '25–50',
        interest: 'White-label program',
        industries: 'Healthcare, defense',
      },
      inovo,
      inovo.econ,
    );
    expect(payload.type).toBe('partner_inquiry');
    expect(payload.assessment).toBeNull();
    expect(payload.partner?.proposedEconomics).toEqual({ marginPct: 25, referralPct: 10, minClients: 1 });
  });
});

describe('HubSpot property mapping', () => {
  it('maps the spec’s custom properties, one per domain', () => {
    const props = contactProperties(buildMspPayload(lead, mspAnswers, inovo));
    expect(props).toMatchObject({
      email: lead.email,
      firstname: 'Dana',
      lastname: 'Whitfield',
      company: lead.company,
      jobtitle: lead.role,
      phone: lead.phone,
      msp_seat_count: lead.seats,
      lead_source_brand: 'inovo',
    });
    expect(props.msp_assessment_score).toBeDefined();
    expect(props.msp_maturity_level).toBeDefined();
    for (const domain of ['tooling', 'lifecycle', 'ir', 'compliance', 'vendor', 'proof']) {
      expect(props[`msp_domain_${domain}_pct`], domain).toBeDefined();
    }
  });

  it('sets lifecyclestage to salesqualifiedlead only for a HOT lead', () => {
    const hot = buildClientPayload(
      {
        name: 'A', email: 'a@b.com', company: 'C', role: 'CIO', phone: '5551234567',
        employees: '200–499', provider: 'In-house', frameworks: [], deadline: '',
        timeline: 'Within 30 days', budget: 'I own the budget', sensitive: 'Yes',
      },
      {},
      inovo,
      VERTICALS.cmmc,
    );
    expect(hot.qualification?.tier).toBe('HOT');
    expect(contactProperties(hot).lifecyclestage).toBe('salesqualifiedlead');

    const cold = buildClientPayload(
      {
        name: 'A', email: 'a@b.com', company: 'C', role: 'CIO', phone: '5551234567',
        employees: '200–499', provider: 'In-house', frameworks: [], deadline: '',
        timeline: 'No set timeline', budget: 'Influence only', sensitive: 'No',
      },
      Object.fromEntries(CLIENT_QUESTIONS.map((_, i) => [i, 0])),
      inovo,
      VERTICALS.cmmc,
    );
    expect(cold.qualification?.tier).toBe('NURTURE');
    expect(contactProperties(cold).lifecyclestage).toBe('lead');
  });
});
