import { describe, expect, it } from 'vitest';
import { score, tok } from '@/lib/scoring/client';
import { FNS, QUESTIONS, VERTICALS, TIERS } from '@/lib/data/client';
import { answerSets, loadReference } from './reference';
import type { Vertical } from '@/lib/types';

const reference = loadReference('client-logic.js');

describe('client assessment scoring', () => {
  it('reproduces the prototype score, tier and function breakdown for every vertical', () => {
    for (const vertical of Object.values(VERTICALS)) {
      const theirVertical = reference.VERTICALS[vertical.id];
      for (const answers of answerSets(40, QUESTIONS.length)) {
        const mine = score(answers, vertical as Vertical);
        const theirs = reference.compute(answers, theirVertical) as {
          score: number;
          tier: { n: number; name: string; summary: string; detail: string };
          fns: { id: string; pct: number; status: string }[];
          recs: { title: string; body: string; service: string }[];
        };

        expect(mine.score).toBe(theirs.score);
        expect(mine.tier).toEqual(theirs.tier);
        expect(mine.fns.map((f) => [f.id, f.pct, f.status])).toEqual(
          theirs.fns.map((f) => [f.id, f.pct, f.status]),
        );
        expect(mine.recs.map((r) => [r.title, r.body, r.service])).toEqual(
          theirs.recs.map((r) => [r.title, r.body, r.service]),
        );
      }
    }
  });

  it('covers six CSF functions with four questions each', () => {
    for (const fn of FNS) {
      expect(QUESTIONS.filter((q) => q.f === fn.id)).toHaveLength(4);
    }
    expect(QUESTIONS).toHaveLength(24);
  });

  it('returns seven recommendations: six by exposure plus the program card', () => {
    const answers: Record<number, number> = {};
    QUESTIONS.forEach((_, i) => {
      answers[i] = i % 4;
    });
    const result = score(answers, VERTICALS.cmmc);
    expect(result.recs).toHaveLength(7);
    expect(result.recs[6].fnId).toBe('program');
    expect(result.recs[6].title).toBe(`Readiness path for ${VERTICALS.cmmc.framework}`);
    expect(result.recs[6].service).toBe(VERTICALS.cmmc.readiness);
  });

  it('maps scores onto the four readiness tiers', () => {
    // Answering every question with option index k gives each function
    // (3 - k) * 4 of 12 points, so the whole-assessment score is predictable.
    const uniform = (k: number) => {
      const answers: Record<number, number> = {};
      QUESTIONS.forEach((_, i) => {
        answers[i] = k;
      });
      return answers;
    };

    expect(score(uniform(0), VERTICALS.cmmc)).toMatchObject({ score: 100, tier: { name: 'Resilient' } });
    expect(score(uniform(1), VERTICALS.cmmc)).toMatchObject({ score: 67, tier: { name: 'Established' } });
    expect(score(uniform(2), VERTICALS.cmmc)).toMatchObject({ score: 33, tier: { name: 'Exposed' } });
    expect(score(uniform(3), VERTICALS.cmmc)).toMatchObject({ score: 0, tier: { name: 'Exposed' } });

    // Half the functions strong and half weak lands in Developing.
    const mixed: Record<number, number> = {};
    QUESTIONS.forEach((q, i) => {
      mixed[i] = ['govern', 'identify', 'protect'].includes(q.f) ? 1 : 2;
    });
    expect(score(mixed, VERTICALS.cmmc)).toMatchObject({ score: 50, tier: { name: 'Developing' } });

    expect(TIERS.map((t) => t.min)).toEqual([0, 40, 60, 80]);
  });

  it('substitutes every vertical token in question and recommendation copy', () => {
    for (const vertical of Object.values(VERTICALS)) {
      const result = score({ 0: 3 }, vertical as Vertical);
      const strings = [
        ...result.recs.map((r) => r.title + r.body),
        result.tier.summary,
        result.tier.detail,
        ...QUESTIONS.map((q) => tok(q.text, vertical as Vertical) + tok(q.help, vertical as Vertical)),
      ];
      for (const s of strings) {
        expect(s).not.toMatch(/\{(FW|DATA|AUD|SYSTEMS)\}/);
      }
    }
  });
});
