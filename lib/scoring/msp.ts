/**
 * MSP assessment scoring — a pure port of `compute()` in reference/msp-logic.js.
 *
 * Six domains × four questions, each option worth 0–3 points:
 *   domainPct = points / 12 × 100
 *   score     = Σ(domainPct × weight) / Σweights, rounded
 *
 * Weights, level thresholds and the gap/watch cutoffs arrive as config so the
 * admin can version them; `DEFAULT_SCORING` is what the prototype shipped.
 */

import { DOMAINS, QUESTIONS, RECS, DEFAULT_SCORING } from '@/lib/data/msp';
import type { Answers } from '@/lib/scoring/answers';
import type { MspResult, Scoring, Status, DomainResult, MspRecommendation } from '@/lib/types';

export function statusFor(pct: number, scoring: Scoring): Status {
  return pct < scoring.gapBelow ? 'gap' : pct < scoring.watchBelow ? 'watch' : 'strong';
}

export function score(answers: Answers, scoring: Scoring = DEFAULT_SCORING): MspResult {
  const s = scoring;

  const doms: DomainResult[] = DOMAINS.map((d) => {
    const qs = QUESTIONS.map((q, i) => ({ q, i })).filter((x) => x.q.d === d.id);
    const raw = qs.reduce(
      (a, x) => a + (answers[x.i] != null ? x.q.options[answers[x.i] as number].points : 0),
      0,
    );
    const max = qs.length * 3;
    const weight = Number(s.weights[d.id]) || 0;
    return {
      id: d.id,
      name: d.name,
      raw,
      max,
      pct: Math.round((raw / max) * 100),
      weight,
      status: 'gap' as Status,
    };
  });

  const wsum = doms.reduce((a, d) => a + d.weight, 0) || 1;
  const total = Math.round(doms.reduce((a, d) => a + d.pct * d.weight, 0) / wsum);

  const lv =
    [...s.levels].sort((a, b) => b.min - a.min).find((l) => total >= Number(l.min)) || s.levels[0];

  doms.forEach((d) => {
    d.status = statusFor(d.pct, s);
  });

  const recs: MspRecommendation[] = doms
    .map((d) => {
      const r = RECS[d.id][d.status];
      return {
        domain: d.name,
        domainId: d.id,
        status: d.status,
        title: r[0],
        body: r[1],
        service: r[2],
        exposure: (100 - d.pct) * d.weight,
      };
    })
    .sort((a, b) => b.exposure - a.exposure);

  return { doms, score: total, level: { n: lv.n, name: lv.name }, recs };
}
