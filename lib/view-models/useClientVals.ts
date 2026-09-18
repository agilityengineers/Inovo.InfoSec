'use client';

/**
 * View model for the client-facing, vertical-tailored assessment.
 *
 * A port of `renderVals()` in reference/client-logic.js. The vertical comes from
 * the resolved brand (one vertical per tenant), and every question, option and
 * recommendation string runs through `tok()` so `{FW} {DATA} {AUD} {SYSTEMS}`
 * read as that vertical's framework, data, auditor and systems.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FNS, QUESTIONS, VERTICALS, TIERS, DEFAULT_QUAL, FW_CHIPS } from '@/lib/data/client';
import { score as computeClient, tok } from '@/lib/scoring/client';
import { firstUnanswered, type Answers } from '@/lib/scoring/answers';
import { validateClientLead } from '@/lib/validation';
import { track, captureUtm } from '@/lib/analytics';
import { useBrand, useBasePath } from '@/lib/brand-context';
import { getTurnstileToken } from '@/lib/turnstile-client';
import type { ClientLeadForm, Vertical } from '@/lib/types';
import type { ClientVals, OptionView } from '@/lib/view-models/types';

export type ClientStage = 'landing' | 'questions' | 'preview' | 'gate' | 'report';

const EMPTY_LEAD: ClientLeadForm = {
  name: '',
  email: '',
  company: '',
  role: '',
  phone: '',
  employees: '',
  provider: '',
  frameworks: [],
  deadline: '',
  timeline: '',
  budget: '',
  sensitive: '',
};

const STATUS_META: Record<string, [string, string]> = {
  gap: ['Gap', '#b3121a'],
  watch: ['Watch', '#b7791f'],
  strong: ['Strong', '#1f7a3a'],
  program: ['Program', '#333'],
};

const answersKey = (brandId: string) => `inovo:client-answers:${brandId}`;

function readAnswers(key: string): Answers {
  if (typeof window === 'undefined') return {};
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as Answers) : {};
  } catch {
    return {};
  }
}

function writeAnswers(key: string, answers: Answers) {
  try {
    window.localStorage.setItem(key, JSON.stringify(answers));
  } catch {
    /* resume is a convenience, never a requirement */
  }
}

export function useClientVals({
  initialStage = 'landing',
}: { initialStage?: ClientStage } = {}): ClientVals {
  const brand = useBrand();
  const basePath = useBasePath();
  const router = useRouter();

  const vertical: Vertical = VERTICALS[brand.vertical || 'cmmc'] || VERTICALS.cmmc;

  const key = answersKey(brand.id);
  const [answers, setAnswers] = useState<Answers>({});
  const [stage, setStage] = useState<ClientStage>(initialStage);
  const [qIndex, setQIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [lead, setLead] = useState<ClientLeadForm>(EMPTY_LEAD);
  const [leadErr, setLeadErr] = useState<Partial<Record<keyof ClientLeadForm, string>>>({});
  const utm = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    setAnswers(readAnswers(key));
  }, [key]);

  useEffect(() => {
    utm.current = captureUtm(window.location.search);
  }, []);

  const top = () => {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* jsdom and older Safari */
    }
  };

  const result = useMemo(() => computeClient(answers, vertical), [answers, vertical]);

  const q = QUESTIONS[qIndex];
  const fn = FNS.find((f) => f.id === q.f)!;
  const sel = answers[qIndex];

  const selectOption = useCallback(
    (idx: number) => {
      setAnswers((prev) => {
        const next = { ...prev, [qIndex]: idx };
        writeAnswers(key, next);
        return next;
      });
      setShowValidation(false);
    },
    [qIndex, key],
  );

  const options: OptionView[] = q.options.map((o, i) => ({
    label: tok(o.label, vertical),
    selected: sel === i,
    select: () => selectOption(i),
    border: sel === i ? brand.primary : '#dcdce0',
    bg: sel === i ? brand.primary + '12' : '#fff',
    dotBorder: sel === i ? brand.primary : '#b5b5bb',
    dotBg: sel === i ? brand.primary : '#fff',
  }));

  const nextQuestion = useCallback(() => {
    if (answers[qIndex] == null) {
      setShowValidation(true);
      return;
    }
    if (qIndex + 1 >= QUESTIONS.length) {
      setStage('preview');
      top();
      return;
    }
    setQIndex(qIndex + 1);
    setShowValidation(false);
  }, [answers, qIndex]);

  const submitLead = useCallback(async () => {
    const errors = validateClientLead(lead);
    if (Object.keys(errors).length) {
      setLeadErr(errors);
      return;
    }
    setLeadErr({});
    setStage('report');
    top();
    track('client_lead_captured', { score: result.score, routing: brand.routing.notify });
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client_assessment_lead',
          brandSlug: brand.slug,
          answers,
          lead,
          source: { host: window.location.host, utm: utm.current },
          turnstileToken: getTurnstileToken(),
        }),
      });
    } catch {
      // The report is already on screen; the pipeline retries server-side.
    }
  }, [lead, answers, brand.slug, brand.routing.notify, result.score]);

  const onLeadChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLead((s) => ({ ...s, [name]: value }));
    setLeadErr((s) => ({ ...s, [name]: undefined }));
  };

  const statusOf = (s: string) => STATUS_META[s] ?? ['Gap', '#b3121a'];
  const sorted = [...result.fns].sort((a, b) => b.pct - a.pct);
  const gaps = result.fns.filter((f) => f.status !== 'strong').length;
  const isPartner = brand.routing.model === 'co-delivery';

  return {
    brand,
    partnerName: brand.name,
    vertical,
    verticalId: vertical.id,
    verticalOptions: Object.values(VERTICALS).map((x) => ({ id: x.id, label: x.label })),
    onVerticalChange: () => {
      /* the vertical is a per-brand setting, changed in the admin */
    },

    is: { page: true, admin: false },
    go: { page: () => router.push(basePath || '/assess'), admin: () => router.push('/admin') },
    setBrand: {
      inovo: () => router.push('/assess'),
      partner: () => router.push('/p/msp-security-services/assess'),
    },

    trustLabel: isPartner
      ? brand.poweredBy
        ? 'Program delivered with Inovo Infosec, which holds'
        : 'Our security partner holds'
      : 'Inovo Infosec holds',
    guideHead: isPartner
      ? `${brand.name} keeps your systems running. Together with Inovo Infosec, we keep them defensible.`
      : 'You do not need to build a security department. You need one that has done this before.',
    guideBody: isPartner
      ? `You already trust us with your IT. For ${vertical.framework}, we bring in Inovo Infosec — a CISO-led compliance and cybersecurity firm — so you get one unified program: we own operations, they own security governance, and there is no gap in between.`
      : `Inovo Infosec is a CISO-led compliance and cybersecurity firm serving ${vertical.audience}. We assess, build, and lead security programs against ${vertical.framework} — and we maintain our own SOC 2 Type II, HITRUST, ISO 27001, and ISO 9001 certifications, passed without exceptions.`,

    stage: {
      landing: stage === 'landing',
      notLanding: stage !== 'landing',
      questions: stage === 'questions',
      preview: stage === 'preview',
      gate: stage === 'gate',
      report: stage === 'report',
    },
    startAssessment: () => {
      track('client_assessment_started', { brand: brand.id, vertical: vertical.id });
      setQIndex(firstUnanswered(answers, QUESTIONS.length));
      setShowValidation(false);
      if (stage === 'landing') {
        router.push(`${basePath}/assess/start`);
      } else {
        setStage('questions');
        top();
      }
    },
    backToTop: (e?: MouseEvent) => {
      e?.preventDefault?.();
      setStage('landing');
      router.push(`${basePath}/assess`);
      top();
    },

    q: {
      text: tok(q.text, vertical),
      help: tok(q.help, vertical),
      fn: fn.name,
      fnDesc: fn.desc,
    },
    qNum: qIndex + 1,
    qTotal: QUESTIONS.length,
    progressPct: Math.round((qIndex / QUESTIONS.length) * 100),
    options,
    showValidation,
    isFirst: qIndex === 0,
    backOpacity: qIndex === 0 ? 0.4 : 1,
    nextLabel: qIndex + 1 >= QUESTIONS.length ? 'See my score' : 'Next →',
    prevQuestion: () => {
      if (qIndex > 0) {
        setQIndex(qIndex - 1);
        setShowValidation(false);
      }
    },
    nextQuestion,

    score: result.score,
    tier: result.tier,
    ring: { dash: `${((result.score / 100) * 326.7).toFixed(1)} 326.7` },
    fnScores: result.fns.map((f) => ({
      ...f,
      statusLabel: statusOf(f.status)[0],
      statusBg: statusOf(f.status)[1],
    })),
    recs: result.recs.map((x, i) => ({
      ...x,
      n: i + 1,
      statusLabel: statusOf(x.status)[0],
      statusBg: statusOf(x.status)[1],
    })),
    tierScale: TIERS.map((t) => ({
      name: t.name,
      bg: t.n <= result.tier.n ? brand.primary : '#e3e3e6',
      color: t.n === result.tier.n ? brand.primary : '#999',
    })),
    bestFn: sorted[0].name,
    worstFn: sorted[sorted.length - 1].name,
    gapCount: gaps || 'no',

    toGate: () => {
      setStage('gate');
      top();
    },
    backToQuestions: () => {
      setStage('questions');
      setQIndex(QUESTIONS.length - 1);
    },
    backToPreview: () => setStage('preview'),

    lead,
    leadErr,
    lb: Object.fromEntries(
      (Object.keys(EMPTY_LEAD) as (keyof ClientLeadForm)[]).map((k) => [
        k,
        leadErr[k] ? '#b3121a' : '#cfcfd3',
      ]),
    ) as Record<keyof ClientLeadForm, string>,
    onLeadChange,
    fwChips: FW_CHIPS.map((label) => {
      const on = lead.frameworks.includes(label);
      return {
        label,
        border: on ? brand.primary : '#cfcfd3',
        bg: on ? brand.primary : '#fff',
        color: on ? '#fff' : '#333',
        toggle: () =>
          setLead((s) => ({
            ...s,
            frameworks: on ? s.frameworks.filter((x) => x !== label) : [...s.frameworks, label],
          })),
      };
    }),
    submitLead,
    routingNote: isPartner
      ? `Your report is shared with ${brand.name} and their security partner, Inovo Infosec, who co-deliver the program.`
      : "Your report goes to Inovo Infosec's advisory team only.",

    retake: () => {
      writeAnswers(key, {});
      setAnswers({});
      setQIndex(0);
      setStage('landing');
      setLead(EMPTY_LEAD);
      setLeadErr({});
      router.push(`${basePath}/assess`);
      top();
    },
    downloadStub: () => {
      const params = new URLSearchParams({
        brand: brand.slug,
        answers: JSON.stringify(answers),
        name: lead.name,
        company: lead.company,
      });
      window.open(`/api/report/client/pdf?${params.toString()}`, '_blank', 'noopener');
    },
  };
}

export { DEFAULT_QUAL };
