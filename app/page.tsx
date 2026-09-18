import { BrandProvider } from '@/lib/brand-context';
import MspLandingScreen from '@/components/screens/MspLandingScreen';
import { currentBrand } from '@/lib/tenant';
import { activeScoring } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/** `/` — the MSP landing page, for the tenant resolved from the hostname. */
export default async function Page() {
  const { brand, basePath } = await currentBrand();
  const scoring = await activeScoring();
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <MspLandingScreen scoring={scoring} />
    </BrandProvider>
  );
}
