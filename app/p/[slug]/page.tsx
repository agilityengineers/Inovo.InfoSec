import { BrandProvider } from '@/lib/brand-context';
import MspLandingScreen from '@/components/screens/MspLandingScreen';
import { currentBrand } from '@/lib/tenant';
import { activeScoring } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/** `/p/[slug]` — the same landing page for a tenant without a custom domain yet. */
export default async function Page({ params }: { params: { slug: string } }) {
  const { brand, basePath } = await currentBrand(params.slug);
  const scoring = await activeScoring();
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <MspLandingScreen scoring={scoring} />
    </BrandProvider>
  );
}
