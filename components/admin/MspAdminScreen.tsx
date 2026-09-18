'use client';

import MspAdmin from '@/components/generated/MspAdmin';
import { useMspAdminVals, type MspAdminData } from '@/lib/view-models/useMspAdminVals';

export default function MspAdminScreen({ data }: { data: MspAdminData }) {
  const V = useMspAdminVals(data);
  return <MspAdmin V={V} />;
}
