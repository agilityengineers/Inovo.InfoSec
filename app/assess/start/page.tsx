import { BrandProvider } from '@/lib/brand-context';
import ClientScreen from '@/components/screens/ClientScreen';
import { currentBrand } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/** `/assess/start` — the client assessment flow. */
export default async function Page() {
  const { brand, basePath } = await currentBrand();
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <ClientScreen initialStage="questions" />
    </BrandProvider>
  );
}
