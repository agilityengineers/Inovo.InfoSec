import { BrandProvider } from '@/lib/brand-context';
import MspAssessmentScreen from '@/components/screens/MspAssessmentScreen';
import { currentBrand } from '@/lib/tenant';
import { activeScoring } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/** `/assessment` — intro → 24 questions → preview → gate → report. */
export default async function Page() {
  const { brand, basePath } = await currentBrand();
  const scoring = await activeScoring();
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <MspAssessmentScreen scoring={scoring} />
    </BrandProvider>
  );
}
