'use client';

import MspLanding from '@/components/generated/MspLanding';
import TurnstileGate from '@/components/TurnstileGate';
import { useMspVals } from '@/lib/view-models/useMspVals';
import type { Scoring } from '@/lib/types';

export default function MspLandingScreen({ scoring }: { scoring: Scoring }) {
  const V = useMspVals({ scoring });
  return (
    <>
      <MspLanding V={V} />
      <TurnstileGate />
    </>
  );
}
