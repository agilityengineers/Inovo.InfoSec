'use client';

import MspAssessment from '@/components/generated/MspAssessment';
import TurnstileGate from '@/components/TurnstileGate';
import { useMspVals } from '@/lib/view-models/useMspVals';
import { useFocusOnStep } from '@/components/screens/useFocusOnStep';
import type { Scoring } from '@/lib/types';

export default function MspAssessmentScreen({ scoring }: { scoring: Scoring }) {
  const V = useMspVals({ scoring });
  useFocusOnStep(V.qNum, 'Assessment question');
  return (
    <>
      <MspAssessment V={V} />
      <TurnstileGate />
    </>
  );
}
