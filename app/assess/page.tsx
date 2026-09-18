import { BrandProvider } from '@/lib/brand-context';
import ClientScreen from '@/components/screens/ClientScreen';
import { currentBrand } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

/** `/assess` — the client-facing landing page, tailored to the brand's vertical. */
export default async function Page() {
  const { brand, basePath } = await currentBrand();
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <ClientScreen initialStage="landing" />
    </BrandProvider>
  );
}
