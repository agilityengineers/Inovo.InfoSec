'use client';

/**
 * View model for the MSP landing page and assessment flow.
 *
 * A port of `renderVals()` in reference/msp-logic.js, with the prototype's
 * `localStorage`-as-a-database swapped for the real pipeline: answers still
 * live in `localStorage` so a visitor can resume, but nothing leaves the
 * browser until the gate form submits, and the lead then goes to `/api/leads`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, Dispatch, MouseEvent, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { DOMAINS, QUESTIONS, LEVEL_TEXT, DEFAULT_SCORING } from '@/lib/data/msp';
import { score as computeMsp } from '@/lib/scoring/msp';
import { answeredCount, firstUnanswered, type Answers } from '@/lib/scoring/answers';
import { validateMspLead, validatePartner } from '@/lib/validation';
import { track, captureUtm } from '@/lib/analytics';
import { useBrand, useBasePath } from '@/lib/brand-context';
import { getTurnstileToken } from '@/lib/turnstile-client';
import type { Econ, MspLeadForm, PartnerForm, Scoring } from '@/lib/types';
import type { MspVals, OptionView } from '@/lib/view-models/types';

export type MspStage = 'intro' | 'questions' | 'preview' | 'gate' | 'report';

const EMPTY_LEAD: MspLeadForm = { name: '', email: '', company: '', role: '', seats: '', phone: '' };
const EMPTY_PARTNER: PartnerForm = { name: '', company: '', email: '', clients: '', interest: '', industries: '' };

const STATUS_META: Record<string, [string, string]> = {
  gap: ['Gap', '#b3121a'],
  watch: ['Watch', '#b7791f'],
  strong: ['Strong', '#1f7a3a'],
};

/** Answers are scoped per assessment and per brand, so a partner preview starts clean. */
const answersKey = (brandId: string) => `inovo:msp-answers:${brandId}`;

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
    /* private browsing, quota — resume is a convenience, never a requirement */
  }
}

export function useMspVals({
  scoring = DEFAULT_SCORING,
  initialStage = 'intro',
}: {
  scoring?: Scoring;
  initialStage?: MspStage;
} = {}): MspVals {
  const brand = useBrand();
  const basePath = useBasePath();
  const router = useRouter();

  const key = answersKey(brand.id);
  const [answers, setAnswers] = useState<Answers>({});
  const [stage, setStage] = useState<MspStage>(initialStage);
  const [qIndex, setQIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [lead, setLead] = useState<MspLeadForm>(EMPTY_LEAD);
  const [leadErr, setLeadErr] = useState<Partial<Record<keyof MspLeadForm, string>>>({});
  const [pf, setPf] = useState<PartnerForm>(EMPTY_PARTNER);
  const [pfErr, setPfErr] = useState<Partial<Record<keyof PartnerForm, string>>>({});
  const [partnerSent, setPartnerSent] = useState(false);
  const [econ, setEcon] = useState<Econ>(brand.econ);
  const utm = useRef<Record<string, string> | null>(null);

  // Saved answers are read after mount so the server and client render alike.
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

  const result = useMemo(() => computeMsp(answers, scoring), [answers, scoring]);

  const q = QUESTIONS[qIndex];
  const domainName = DOMAINS.find((d) => d.id === q.d)!.name;
  const sel = answers[qIndex];

  const selectOption = useCallback(
    (idx: number) => {
      setAnswers((prev) => {
        const next = { ...prev, [qIndex]: idx };
        writeAnswers(key, next);
        return next;
      });
      track('question_answered', { q: qIndex + 1, option: idx });
      setShowValidation(false);
    },
    [qIndex, key],
  );

  const options: OptionView[] = q.options.map((o, i) => ({
    label: o.label,
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
      track('score_previewed', { score: computeMsp(answers, scoring).score });
      setStage('preview');
      top();
      return;
    }
    setQIndex(qIndex + 1);
    setShowValidation(false);
  }, [answers, qIndex, scoring]);

  const submitLead = useCallback(async () => {
    const errors = validateMspLead(lead);
    if (Object.keys(errors).length) {
      setLeadErr(errors);
      return;
    }
    setLeadErr({});
    setStage('report');
    top();
    track('lead_captured', { score: result.score, level: result.level.n });
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'assessment_lead',
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
  }, [lead, answers, brand.slug, result.score, result.level.n]);

  const submitPartner = useCallback(async () => {
    const errors = validatePartner(pf);
    if (Object.keys(errors).length) {
      setPfErr(errors);
      return;
    }
    setPfErr({});
    setPartnerSent(true);
    track('partner_inquiry', { company: pf.company });
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'partner_inquiry',
          brandSlug: brand.slug,
          form: pf,
          source: { host: window.location.host, utm: utm.current },
          turnstileToken: getTurnstileToken(),
        }),
      });
    } catch {
      /* the success state has already been shown; server-side retry covers it */
    }
  }, [pf, brand.slug]);

  const onField =
    <T extends object>(
      setter: Dispatch<SetStateAction<T>>,
      errSetter: Dispatch<SetStateAction<Partial<Record<keyof T, string>>>>,
    ) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const t = e.target as HTMLInputElement;
      const value = t.type === 'checkbox' ? t.checked : t.value;
      setter((s) => ({ ...s, [t.name]: value }));
      errSetter((s) => ({ ...s, [t.name]: undefined }));
    };

  const statusOf = (s: string) => STATUS_META[s] ?? ['Gap', '#b3121a'];
  const sorted = [...result.doms].sort((a, b) => b.pct - a.pct);
  const lt = LEVEL_TEXT[result.level.n] || ['', ''];
  const gaps = result.doms.filter((d) => d.status !== 'strong').length;

  const answered = answeredCount(answers);

  return {
    brand,
    partnerName: brand.name,
    is: { landing: true, assess: true, admin: false, notes: false },
    go: {
      landing: (e?: MouseEvent) => {
        e?.preventDefault?.();
        router.push(basePath || '/');
      },
      assess: () => router.push(`${basePath}/assessment`),
      admin: () => router.push('/admin'),
      notes: () => router.push('/admin/notes'),
    },
    setBrand: {
      inovo: () => router.push('/'),
      // "Preview the white-label demo" on the landing page: in production the
      // brand resolves per tenant, so this navigates to the partner's path.
      partner: () => router.push('/p/msp-security-services'),
    },

    domainList: DOMAINS.map((d, i) => ({ ...d, n: i + 1 })),

    startAssessment: () => {
      track('assessment_started', { brand: brand.id });
      router.push(`${basePath}/assessment`);
    },
    beginQuestions: () => {
      setQIndex(firstUnanswered(answers, QUESTIONS.length));
      setStage('questions');
      setShowValidation(false);
    },
    hasProgress: answered > 0 && stage === 'intro',
    answeredCount: answered,

    stage: {
      intro: stage === 'intro',
      questions: stage === 'questions',
      preview: stage === 'preview',
      gate: stage === 'gate',
      report: stage === 'report',
    },

    q: { text: q.text, help: q.help, domainName },
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
    level: { n: result.level.n, name: result.level.name, summary: lt[0], detail: lt[1] },
    ring: { dash: `${((result.score / 100) * 326.7).toFixed(1)} 326.7` },
    domainScores: result.doms.map((d) => ({
      ...d,
      statusLabel: statusOf(d.status)[0],
      statusBg: statusOf(d.status)[1],
    })),
    recs: result.recs.map((x, i) => ({
      ...x,
      n: i + 1,
      statusLabel: statusOf(x.status)[0],
      statusBg: statusOf(x.status)[1],
    })),
    levelScale: scoring.levels.map((l) => ({
      n: l.n,
      bg: l.n <= result.level.n ? brand.primary : '#e3e3e6',
      color: l.n === result.level.n ? brand.primary : '#999',
    })),
    bestDomain: sorted[0].name,
    worstDomain: sorted[sorted.length - 1].name,
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
    leadBorder: Object.fromEntries(
      (['name', 'email', 'company', 'role', 'seats', 'phone'] as const).map((k) => [
        k,
        leadErr[k] ? '#b3121a' : '#cfcfd3',
      ]),
    ) as Record<keyof MspLeadForm, string>,
    onLeadChange: onField(setLead, setLeadErr),
    submitLead,

    pf,
    pfErr,
    onPartnerChange: onField(setPf, setPfErr),
    submitPartner,
    partnerSent,
    partnerNotSent: !partnerSent,
    partnerCtaUrl: brand.ctaPartnerUrl || '',

    retake: () => {
      writeAnswers(key, {});
      setAnswers({});
      setQIndex(0);
      setStage('intro');
      setLead(EMPTY_LEAD);
      setLeadErr({});
      top();
    },
    downloadStub: () => {
      const params = new URLSearchParams({
        brand: brand.slug,
        answers: JSON.stringify(answers),
        name: lead.name,
        company: lead.company,
      });
      window.open(`/api/report/msp/pdf?${params.toString()}`, '_blank', 'noopener');
    },

    econ,
    onEconChange: (e) => setEcon((s) => ({ ...s, [e.target.name]: Number(e.target.value) })),
  };
}
