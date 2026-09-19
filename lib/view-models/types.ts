/**
 * The shapes the generated screen components read.
 *
 * These mirror the `renderVals()` return values in the reference logic files,
 * because `components/generated/*` is a mechanical transliteration of the
 * approved markup and reads exactly those property paths. Renaming anything
 * here means regenerating the screens, so treat it as a published contract.
 */

import type { ChangeEvent, MouseEvent } from 'react';
import type {
  Brand,
  ClientLeadForm,
  DomainResult,
  Econ,
  FunctionResult,
  MspLeadForm,
  Option,
  PartnerForm,
  Qualification,
  Status,
  Vertical,
} from '@/lib/types';

/** A brand decorated with the derived values the markup uses. */
export type BrandView = Brand & {
  primaryDark: string;
  primarySoft: string;
  hasLogo: boolean;
  noLogo: boolean;
  initials: string;
};

export type OptionView = {
  label: string;
  selected: boolean;
  select: () => void;
  border: string;
  bg: string;
  dotBorder: string;
  dotBg: string;
};

export type StatusView = { statusLabel: string; statusBg: string };

export type LeadRow = {
  id: string;
  name: string;
  company: string;
  role?: string;
  typeLabel?: string;
  typeBg?: string;
  qual?: string;
  qualBg?: string;
  reasons?: string;
  meta: string;
  when: string;
  bg: string;
  select: () => void;
};

export type IntegrationLogEntry = { when: string; target: string; msg: string; color: string };

export type Stage<K extends string> = Record<K, boolean>;

type FieldHandler = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

// ------------------------------------------------------------------- MSP

export type MspVals = {
  brand: BrandView;
  partnerName: string;
  is: { landing: boolean; assess: boolean; admin: boolean; notes: boolean };
  go: { landing: (e?: MouseEvent) => void; assess: () => void; admin: () => void; notes: () => void };
  setBrand: { inovo: () => void; partner: () => void };

  domainList: { id: string; name: string; blurb: string; n: number }[];

  startAssessment: () => void;
  beginQuestions: () => void;
  hasProgress: boolean;
  answeredCount: number;

  stage: Stage<'intro' | 'questions' | 'preview' | 'gate' | 'report'>;

  q: { text: string; help: string; domainName: string };
  qNum: number;
  qTotal: number;
  progressPct: number;
  options: OptionView[];
  showValidation: boolean;
  isFirst: boolean;
  backOpacity: number;
  nextLabel: string;
  prevQuestion: () => void;
  nextQuestion: () => void;

  score: number;
  level: { n: number; name: string; summary: string; detail: string };
  ring: { dash: string };
  domainScores: (DomainResult & StatusView)[];
  recs: {
    n: number;
    domain: string;
    domainId: string;
    status: Status;
    title: string;
    body: string;
    service: string;
    statusLabel: string;
    statusBg: string;
  }[];
  levelScale: { n: number; bg: string; color: string }[];
  bestDomain: string;
  worstDomain: string;
  gapCount: number | string;

  toGate: () => void;
  backToQuestions: () => void;
  backToPreview: () => void;

  lead: MspLeadForm;
  leadErr: Partial<Record<keyof MspLeadForm, string>>;
  leadBorder: Record<keyof MspLeadForm, string>;
  onLeadChange: FieldHandler;
  submitLead: () => void;

  pf: PartnerForm;
  pfErr: Partial<Record<keyof PartnerForm, string>>;
  onPartnerChange: FieldHandler;
  submitPartner: () => void;
  partnerSent: boolean;
  partnerNotSent: boolean;
  partnerCtaUrl: string;

  retake: () => void;
  downloadStub: () => void;

  econ: Econ;
  onEconChange: FieldHandler;

};

/** The `/admin` screens for the MSP assessment. */
export type MspAdminVals = {
  brand: BrandView;
  partnerName: string;
  qTotal: number;
  econ: Econ;
  onEconChange: FieldHandler;
  setBrand: { inovo: () => void; partner: () => void };
  leadCount: number;
  noLeads: boolean;
  leadRows: LeadRow[];
  selectedLabel: string;
  noSelected: boolean;
  payloadJson: string;
  pushHubspot: () => void;
  pushZapier: () => void;
  integrationLog: IntegrationLogEntry[];
  noLog: boolean;
  tab: Record<'leads' | 'integrations' | 'scoring' | 'config', () => void>;
  tabBg: Record<'leads' | 'integrations' | 'scoring' | 'config', string>;
  tabColor: Record<'leads' | 'integrations' | 'scoring' | 'config', string>;
  adminIs: Record<'leads' | 'integrations' | 'scoring' | 'config', boolean>;
  cfg: { hubspotPortal: string; zapierHook: string; gapBelow: number; watchBelow: number };
  onCfgChange: FieldHandler;
  weightRows: { id: string; name: string; weight: number }[];
  onWeightChange: FieldHandler;
  thresholdRows: { n: number; name: string; min: number; locked: boolean }[];
  onThresholdChange: FieldHandler;
  resetScoring: () => void;
  questionBank: { n: number; text: string; domainName: string; options: Option[] }[];
  /** `logo` is narrowed to a string: a controlled text input cannot take null. */
  cfgBrands: Record<'inovo' | 'partner', Omit<Brand, 'logo'> & { logo: string }>;
  onBrandCfg: FieldHandler;
  resetBrands: () => void;
  brandJson: string;
  seedDemoLead: () => void;
};

// ---------------------------------------------------------------- Client

export type ClientVals = {
  brand: BrandView;
  partnerName: string;
  vertical: Vertical;
  verticalId: string;
  verticalOptions: { id: string; label: string }[];
  onVerticalChange: FieldHandler;

  is: { page: boolean; admin: boolean };
  go: { page: () => void; admin: () => void };
  setBrand: { inovo: () => void; partner: () => void };

  trustLabel: string;
  guideHead: string;
  guideBody: string;

  stage: Stage<'landing' | 'notLanding' | 'questions' | 'preview' | 'gate' | 'report'>;
  startAssessment: () => void;
  backToTop: (e?: MouseEvent) => void;

  q: { text: string; help: string; fn: string; fnDesc: string };
  qNum: number;
  qTotal: number;
  progressPct: number;
  options: OptionView[];
  showValidation: boolean;
  isFirst: boolean;
  backOpacity: number;
  nextLabel: string;
  prevQuestion: () => void;
  nextQuestion: () => void;

  score: number;
  tier: { n: number; name: string; summary: string; detail: string };
  ring: { dash: string };
  fnScores: (FunctionResult & StatusView)[];
  recs: {
    n: number;
    fn: string;
    fnId: string;
    status: Status | 'program';
    title: string;
    body: string;
    service: string;
    statusLabel: string;
    statusBg: string;
  }[];
  tierScale: { name: string; bg: string; color: string }[];
  bestFn: string;
  worstFn: string;
  gapCount: number | string;

  toGate: () => void;
  backToQuestions: () => void;
  backToPreview: () => void;

  lead: ClientLeadForm;
  leadErr: Partial<Record<keyof ClientLeadForm, string>>;
  lb: Record<keyof ClientLeadForm, string>;
  onLeadChange: FieldHandler;
  fwChips: { label: string; border: string; bg: string; color: string; toggle: () => void }[];
  submitLead: () => void;
  routingNote: string;

  retake: () => void;
  downloadStub: () => void;

};

/** The `/admin` screens for the client assessment. */
export type ClientAdminVals = {
  verticalOptions: { id: string; label: string }[];
  leadCount: number;
  noLeads: boolean;
  leadRows: LeadRow[];
  selectedLabel: string;
  payloadJson: string;
  seedDemoLead: () => void;
  qual: Qualification;
  onQualChange: FieldHandler;
  brandVerticalRows: { id: string; name: string; verticalId: string; routing: string }[];
  onBrandVertical: FieldHandler;
};
