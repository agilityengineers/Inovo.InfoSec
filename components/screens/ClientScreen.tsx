'use client';

import ClientPage from '@/components/generated/ClientPage';
import TurnstileGate from '@/components/TurnstileGate';
import { useClientVals, type ClientStage } from '@/lib/view-models/useClientVals';
import { useFocusOnStep } from '@/components/screens/useFocusOnStep';

export default function ClientScreen({ initialStage }: { initialStage: ClientStage }) {
  const V = useClientVals({ initialStage });
  useFocusOnStep(V.qNum, 'Client question');
  return (
    <>
      <ClientPage V={V} />
      <TurnstileGate />
    </>
  );
}
