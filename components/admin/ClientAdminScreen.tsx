'use client';

import ClientAdmin from '@/components/generated/ClientAdmin';
import { useClientAdminVals, type ClientAdminData } from '@/lib/view-models/useClientAdminVals';

export default function ClientAdminScreen({ data }: { data: ClientAdminData }) {
  const V = useClientAdminVals(data);
  return <ClientAdmin V={V} />;
}
