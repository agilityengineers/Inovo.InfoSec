import { BrandProvider } from '@/lib/brand-context';
import ClientScreen from '@/components/screens/ClientScreen';
import { currentBrand } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: { slug: string } }) {
  const { brand, basePath } = await currentBrand(params.slug);
  return (
    <BrandProvider brand={brand} basePath={basePath}>
      <ClientScreen initialStage="landing" />
    </BrandProvider>
  );
}
