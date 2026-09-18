import { describe, expect, it } from 'vitest';
import { qualify, urgencyDays } from '@/lib/scoring/client';
import { DEFAULT_QUAL } from '@/lib/data/client';
import { loadReference } from './reference';

const reference = loadReference('client-logic.js');

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

describe('lead qualification', () => {
  it('reproduces the prototype tier and reasons across the decision space', () => {
    const budgets = ['I own the budget', 'Shared decision', 'Influence only'];
    const timelines = ['Within 30 days', 'Within 90 days', 'Within 180 days', 'No set timeline'];
    const deadlines = ['', inDays(10), inDays(120), inDays(400)];

    for (const score of [0, 30, 59, 60, 74, 75, 90, 100]) {
      for (const budget of budgets) {
        for (const timeline of timelines) {
          for (const deadline of deadlines) {
            const lead = { budget, timeline, deadline };
            expect(qualify(score, lead, DEFAULT_QUAL)).toEqual(
              reference.qualify(score, lead, reference.DEFAULT_QUAL),
            );
          }
        }
      }
    }
  });

  it('is HOT only when the score, the urgency and budget authority all agree', () => {
    const soon = { timeline: 'Within 90 days', budget: 'I own the budget', deadline: '' };
    expect(qualify(59, soon).tier).toBe('HOT');

    // Any one of the three failing drops it out of HOT.
    expect(qualify(60, soon).tier).not.toBe('HOT');
    expect(qualify(59, { ...soon, timeline: 'Within 180 days' }).tier).not.toBe('HOT');
    expect(qualify(59, { ...soon, budget: 'Influence only' }).tier).not.toBe('HOT');
  });

  it('falls to WARM on either signal and NURTURE on neither', () => {
    expect(qualify(74, { timeline: 'No set timeline', budget: 'Influence only' }).tier).toBe('WARM');
    expect(qualify(90, { timeline: 'Within 180 days', budget: 'Influence only' }).tier).toBe('WARM');
    expect(qualify(90, { timeline: 'No set timeline', budget: 'I own the budget' }).tier).toBe('NURTURE');
  });

  it('prefers an explicit deadline over the timeline bucket', () => {
    expect(urgencyDays({ deadline: inDays(14), timeline: 'No set timeline' })).toBeLessThanOrEqual(15);
    expect(urgencyDays({ timeline: 'Within 30 days' })).toBe(30);
    expect(urgencyDays({ timeline: 'No set timeline' })).toBe(9999);
    expect(urgencyDays({})).toBe(9999);
  });

  it('respects admin-edited thresholds', () => {
    const strict = { hotScoreBelow: 30, hotDays: 7, warmScoreBelow: 40, warmDays: 14 };
    const lead = { timeline: 'Within 90 days', budget: 'I own the budget', deadline: '' };
    expect(qualify(59, lead, strict).tier).toBe('NURTURE');
    expect(qualify(29, lead, strict).tier).toBe('WARM');
    expect(qualify(29, { ...lead, deadline: inDays(3) }, strict).tier).toBe('HOT');
  });

  it('records the reasons that drove the decision', () => {
    const result = qualify(50, { timeline: 'Within 30 days', budget: 'I own the budget' });
    expect(result.tier).toBe('HOT');
    expect(result.reasons).toContain('score 50 < 60');
    expect(result.reasons).toContain('urgency 30d ≤ 90d');
  });
});
