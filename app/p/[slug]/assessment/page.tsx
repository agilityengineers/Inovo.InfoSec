import { BrandProvider } from '@/lib/brand-context';
import MspAssessmentScreen from '@/components/screens/MspAssessmentScreen';
import { currentBrand } from '@/lib/tenant';
import { activeScoring } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { slug: string } }) {
  const { brand, basePath } = await currentBrand(params.slug);
  const scoring = await activeScoring();
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <MspAssessmentScreen scoring={scoring} />
    </BrandProvider>
  );
}
