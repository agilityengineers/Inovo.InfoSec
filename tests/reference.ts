/**
 * Loads the reference prototype logic so the production port can be tested
 * against it directly, rather than against numbers copied out of it by hand.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

type ReferenceInstance = {
  QUESTIONS: { d?: string; f?: string; options: { label: string; points: number }[] }[];
  DOMAINS: { id: string; name: string }[];
  FNS: { id: string; name: string }[];
  VERTICALS: Record<string, Record<string, unknown>>;
  DEFAULT_SCORING: Record<string, unknown>;
  DEFAULT_QUAL: Record<string, number>;
  compute: (answers: Record<number, number>, arg?: unknown) => Record<string, unknown>;
  qualify: (
    score: number,
    lead: Record<string, unknown>,
    qual?: Record<string, number>,
  ) => { tier: string; reasons: string[] };
  urgencyDays: (lead: Record<string, unknown>) => number;
  state: Record<string, unknown>;
};

export function loadReference(file: 'msp-logic.js' | 'client-logic.js'): ReferenceInstance {
  const src = fs.readFileSync(path.join(process.cwd(), 'reference', file), 'utf8');
  const sandbox: Record<string, unknown> = {
    DCLogic: class {
      setState() {}
    },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console,
    window: { scrollTo() {} },
    Date,
  };
  vm.createContext(sandbox);
  vm.runInContext(`${src}\n;globalThis.__instance = new Component({});`, sandbox);
  return sandbox.__instance as ReferenceInstance;
}

/** Deterministic pseudo-random answer sets, so a failure is reproducible. */
export function answerSets(count: number, questions: number): Record<number, number>[] {
  let seed = 12345;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const sets: Record<number, number>[] = [];
  for (let s = 0; s < count; s++) {
    const answers: Record<number, number> = {};
    for (let i = 0; i < questions; i++) {
      // Every ninth set leaves some questions unanswered, as a partial run does.
      if (s % 9 === 8 && next() < 0.3) continue;
      answers[i] = Math.floor(next() * 4);
    }
    sets.push(answers);
  }
  return sets;
}
