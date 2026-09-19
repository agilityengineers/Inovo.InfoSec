import { describe, expect, it } from 'vitest';
import { score } from '@/lib/scoring/msp';
import { DOMAINS, QUESTIONS, DEFAULT_SCORING } from '@/lib/data/msp';
import { answerSets, loadReference } from './reference';

const reference = loadReference('msp-logic.js');

describe('MSP scoring', () => {
  it('reproduces the prototype score, level and domain breakdown exactly', () => {
    for (const answers of answerSets(200, QUESTIONS.length)) {
      const mine = score(answers, DEFAULT_SCORING);
      const theirs = reference.compute(answers, reference.DEFAULT_SCORING) as {
        score: number;
        level: { n: number; name: string };
        doms: { id: string; pct: number; raw: number; status: string }[];
        recs: { title: string; service: string }[];
      };

      expect(mine.score).toBe(theirs.score);
      expect(mine.level).toEqual(theirs.level);
      expect(mine.doms.map((d) => [d.id, d.raw, d.pct, d.status])).toEqual(
        theirs.doms.map((d) => [d.id, d.raw, d.pct, d.status]),
      );
      expect(mine.recs.map((r) => [r.title, r.service])).toEqual(
        theirs.recs.map((r) => [r.title, r.service]),
      );
    }
  });

  it('weights each domain out of 12 points, four questions apiece', () => {
    for (const domain of DOMAINS) {
      expect(QUESTIONS.filter((q) => q.d === domain.id)).toHaveLength(4);
    }
    expect(QUESTIONS).toHaveLength(24);
  });

  it('scores a perfect run 100 at the top level and an unanswered run 0 at level 1', () => {
    const best: Record<number, number> = {};
    QUESTIONS.forEach((_, i) => {
      best[i] = 0;
    });
    const perfect = score(best, DEFAULT_SCORING);
    expect(perfect.score).toBe(100);
    expect(perfect.level).toEqual({ n: 5, name: 'Optimized' });
    expect(perfect.doms.every((d) => d.status === 'strong')).toBe(true);

    const empty = score({}, DEFAULT_SCORING);
    expect(empty.score).toBe(0);
    expect(empty.level.n).toBe(1);
    expect(empty.doms.every((d) => d.status === 'gap')).toBe(true);
  });

  it('orders recommendations by weighted exposure, worst first', () => {
    const answers: Record<number, number> = {};
    QUESTIONS.forEach((_, i) => {
      answers[i] = i % 4;
    });
    const result = score(answers, DEFAULT_SCORING);
    const exposures = result.recs.map((r) => r.exposure);
    expect([...exposures].sort((a, b) => b - a)).toEqual(exposures);
  });

  it('honours admin-edited weights, cutoffs and level thresholds', () => {
    const answers: Record<number, number> = {};
    QUESTIONS.forEach((_, i) => {
      answers[i] = i % 4;
    });

    // Weighting one domain to the exclusion of the rest yields that domain's own pct.
    const onlyProof = score(answers, {
      ...DEFAULT_SCORING,
      weights: { tooling: 0, lifecycle: 0, ir: 0, compliance: 0, vendor: 0, proof: 100 },
    });
    const proof = onlyProof.doms.find((d) => d.id === 'proof')!;
    expect(onlyProof.score).toBe(proof.pct);

    // Raising the cutoffs turns previously "strong" domains into gaps.
    const strict = score(answers, { ...DEFAULT_SCORING, gapBelow: 101, watchBelow: 101 });
    expect(strict.doms.every((d) => d.status === 'gap')).toBe(true);
  });
});
