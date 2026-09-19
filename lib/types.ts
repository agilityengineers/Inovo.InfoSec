/** Shared domain types for both assessments, the brand layer and the lead pipeline. */

export type Status = 'gap' | 'watch' | 'strong';

export type Option = { label: string; points: number };

export type Domain = { id: string; name: string; blurb: string };

export type MspQuestion = { d: string; text: string; help: string; options: Option[] };

export type CsfFunction = { id: string; name: string; desc: string };

export type ClientQuestion = { f: string; text: string; help: string; options: Option[] };

/** `[title, body, service]` per status — the shape the prototype's copy tables use. */
export type RecTable = Record<string, Record<Status, [string, string, string]>>;

export type LevelText = Record<number | string, [string, string]>;

export type Level = { n: number; name: string; min: number };

export type Scoring = {
  weights: Record<string, number>;
  levels: Level[];
  gapBelow: number;
  watchBelow: number;
};

export type Tier = { n: number; name: string; min: number; summary: string; detail: string };

export type Qualification = {
  hotScoreBelow: number;
  hotDays: number;
  warmScoreBelow: number;
  warmDays: number;
};

export type QualificationTier = 'HOT' | 'WARM' | 'NURTURE';

export type Econ = { marginPct: number; referralPct: number; minClients: number };

export type Routing = { model: 'direct' | 'co-delivery'; notify: string[]; owner?: string };

export type Vertical = {
  id: string;
  label: string;
  audience: string;
  framework: string;
  data: string;
  systems: string;
  auditor: string;
  headline: string;
  subhead: string;
  problemHead: string;
  problemBody: string;
  pressures: { who: string; ask: string; why: string }[];
  stakesHead: string;
  stakes: string[];
  deadlineLabel: string;
  sensitiveLabel: string;
  playbook: string;
  guideProof: string;
  readiness: string;
};

/** One tenant. Nothing brand-related may be hardcoded in a component. */
export type Brand = {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  tagline: string;
  /** URL; `null`/`''` falls back to the initials square + name text mark. */
  logo: string | null;
  /** Hex, published to the page as `--brand`. */
  primary: string;
  phone: string;
  incidentPhone: string;
  email: string;
  address: string;
  ctaDirectLabel: string;
  ctaDirectUrl: string;
  /** Inovo only. */
  ctaPartnerUrl?: string;
  reportCtaLabel: string;
  /** Show "delivered with Inovo Infosec". */
  poweredBy: boolean;
  /** MSP report: show the partner-program CTA. */
  showPartnerCta?: boolean;
  /** Client assessment: one vertical per brand. */
  vertical?: string;
  hostnames: string[];
  routing: Routing;
  econ: Econ;
};

// ---------------------------------------------------------------- results

export type DomainResult = {
  id: string;
  name: string;
  raw: number;
  max: number;
  pct: number;
  weight: number;
  status: Status;
};

export type MspRecommendation = {
  domain: string;
  domainId: string;
  status: Status;
  title: string;
  body: string;
  service: string;
  exposure: number;
};

export type MspResult = {
  doms: DomainResult[];
  score: number;
  level: { n: number; name: string };
  recs: MspRecommendation[];
};

export type FunctionResult = {
  id: string;
  name: string;
  desc: string;
  raw: number;
  max: number;
  pct: number;
  status: Status;
};

export type ClientRecommendation = {
  fn: string;
  fnId: string;
  status: Status | 'program';
  title: string;
  body: string;
  service: string;
  exposure: number;
};

export type ClientResult = {
  fns: FunctionResult[];
  score: number;
  tier: { n: number; name: string; summary: string; detail: string };
  recs: ClientRecommendation[];
};

// ------------------------------------------------------------------ leads

export type MspLeadForm = {
  name: string;
  email: string;
  company: string;
  role: string;
  seats: string;
  phone: string;
};

export type PartnerForm = {
  name: string;
  company: string;
  email: string;
  clients: string;
  interest: string;
  industries: string;
};

export type ClientLeadForm = {
  name: string;
  email: string;
  company: string;
  role: string;
  phone: string;
  employees: string;
  provider: string;
  frameworks: string[];
  deadline: string;
  timeline: string;
  budget: string;
  sensitive: string;
};

export type Utm = Record<string, string> | null;

export type LeadType = 'assessment_lead' | 'partner_inquiry' | 'client_assessment_lead';

/** The structured payload persisted on the lead and fanned out to integrations. */
export type LeadPayload = {
  type: LeadType;
  submittedAt: string;
  brand: { id: string; name: string };
  vertical?: { id: string; label: string; framework: string };
  source?: { host: string; utm: Utm; assessmentVersion: string };
  contact: {
    name: string;
    email: string;
    company: string;
    role: string | null;
    seatCount?: string | null;
    phone: string | null;
  };
  partner?: {
    clientsUnderManagement: string;
    interest: string;
    industries: string;
    proposedEconomics: Econ;
  };
  qualification?: {
    tier: QualificationTier;
    reasons: string[];
    urgencyDays: number;
    employees: string;
    currentProvider: string;
    frameworksRequired: string[];
    deadline: string | null;
    timeline: string;
    budgetAuthority: string;
    handlesSensitiveData: string;
  };
  assessment: {
    score: number;
    level?: { n: number; name: string };
    tier?: string;
    domains?: { id: string; name: string; points: number; max: number; pct: number; weight: number; status: Status }[];
    functions?: { id: string; name: string; points: number; max: number; pct: number; status: Status }[];
    answers: {
      id: string;
      domain?: string;
      function?: string;
      question: string;
      answer: string | null;
      points: number | null;
    }[];
  } | null;
  recommendations?: { domain?: string; function?: string; status: string; title: string; service: string }[];
  playbook?: { title: string; status: string };
  routing?: Routing;
  integrations: Record<string, unknown>;
};
