/** Answers are a sparse map of question index → chosen option index. */
export type Answers = Record<number, number | undefined>;

/** Index of the first unanswered question, for resuming a saved run. */
export function firstUnanswered(answers: Answers, total: number): number {
  let i = 0;
  while (i < total && answers[i] != null) i++;
  return Math.min(i, total - 1);
}

export function answeredCount(answers: Answers): number {
  return Object.keys(answers).length;
}
