/**
 * Client assessment scoring — a pure port of `compute()`, `urgencyDays()` and
 * `qualify()` in reference/client-logic.js.
 *
 * Six NIST CSF 2.0 functions × four questions, equal weights:
 *   functionPct = points / 12 × 100
 *   score       = mean(functionPct), rounded
 *
 * Seven recommendations come back: the six functions ordered by exposure, then
 * a fixed "Program" card built from the vertical's readiness service.
 */

import { FNS, QUESTIONS, RECS, TIERS, DEFAULT_QUAL } from '@/lib/data/client';
import type { Answers } from '@/lib/scoring/answers';
import type {
  ClientResult,
  ClientRecommendation,
  FunctionResult,
  Qualification,
  QualificationTier,
  Status,
  Vertical,
} from '@/lib/types';

/** Substitutes the vertical's tokens into a copy string. */
export function tok(s: string, v: Vertical): string {
  return String(s)
    .replace(/\{FW\}/g, v.framework)
    .replace(/\{DATA\}/g, v.data)
    .replace(/\{AUD\}/g, v.auditor)
    .replace(/\{SYSTEMS\}/g, v.systems);
}

export function score(answers: Answers, v: Vertical): ClientResult {
  const fns: FunctionResult[] = FNS.map((f) => {
    const qs = QUESTIONS.map((q, i) => ({ q, i })).filter((x) => x.q.f === f.id);
    const raw = qs.reduce(
      (a, x) => a + (answers[x.i] != null ? x.q.options[answers[x.i] as number].points : 0),
      0,
    );
    const pct = Math.round((raw / (qs.length * 3)) * 100);
    return {
      id: f.id,
      name: f.name,
      desc: f.desc,
      raw,
      max: qs.length * 3,
      pct,
      status: (pct < 50 ? 'gap' : pct < 75 ? 'watch' : 'strong') as Status,
    };
  });

  const total = Math.round(fns.reduce((a, f) => a + f.pct, 0) / fns.length);
  const tier = [...TIERS].sort((a, b) => b.min - a.min).find((t) => total >= t.min) || TIERS[0];

  const recs: ClientRecommendation[] = fns
    .map((f) => {
      const r = RECS[f.id][f.status];
      return {
        fn: f.name,
        fnId: f.id,
        status: f.status,
        title: tok(r[0], v),
        body: tok(r[1], v),
        service: r[2],
        exposure: 100 - f.pct,
      };
    })
    .sort((a, b) => b.exposure - a.exposure);

  recs.push({
    fn: 'Program',
    fnId: 'program',
    status: 'program',
    title: `Readiness path for ${v.framework}`,
    body: `The gaps above are closed fastest inside a single program run against ${v.framework}: assess formally, remediate in priority order, and manage the evidence so ${v.auditor} gets a straight answer.`,
    service: v.readiness,
    exposure: -1,
  });

  return {
    fns,
    score: total,
    tier: {
      n: tier.n,
      name: tier.name,
      summary: tok(tier.summary, v),
      detail: tok(tier.detail, v),
    },
    recs,
  };
}

/** Days until the stated deadline, else the timeline bucket, else 9999. */
export function urgencyDays(lead: { deadline?: string; timeline?: string }): number {
  if (lead.deadline) {
    const d = Math.ceil((new Date(lead.deadline).getTime() - Date.now()) / 86400000);
    if (!isNaN(d)) return d;
  }
  const buckets: Record<string, number> = {
    'Within 30 days': 30,
    'Within 90 days': 90,
    'Within 180 days': 180,
  };
  return lead.timeline != null && buckets[lead.timeline] != null ? buckets[lead.timeline] : 9999;
}

export function qualify(
  total: number,
  lead: { deadline?: string; timeline?: string; budget?: string },
  qual: Qualification = DEFAULT_QUAL,
): { tier: QualificationTier; reasons: string[] } {
  const q = qual;
  const days = urgencyDays(lead);
  const reasons: string[] = [];
  const budgetOk = lead.budget !== 'Influence only';

  if (total < q.hotScoreBelow) reasons.push(`score ${total} < ${q.hotScoreBelow}`);
  if (days <= q.hotDays) reasons.push(`urgency ${days}d ≤ ${q.hotDays}d`);
  if (!budgetOk) reasons.push('no budget authority');

  if (total < q.hotScoreBelow && days <= q.hotDays && budgetOk) return { tier: 'HOT', reasons };

  if (total < q.warmScoreBelow || days <= q.warmDays) {
    if (total < q.warmScoreBelow && !(total < q.hotScoreBelow)) {
      reasons.push(`score ${total} < ${q.warmScoreBelow}`);
    }
    if (days <= q.warmDays && !(days <= q.hotDays)) {
      reasons.push(`urgency ${days}d ≤ ${q.warmDays}d`);
    }
    return { tier: 'WARM', reasons };
  }

  return {
    tier: 'NURTURE',
    reasons: [`score ${total}`, days < 9999 ? `urgency ${days}d` : 'no timeline'],
  };
}
