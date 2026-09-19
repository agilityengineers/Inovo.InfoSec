import 'server-only';

import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveBrand, brandBySlug } from '@/lib/repo';
import type { Brand } from '@/lib/types';

/**
 * Resolves the tenant for the current request.
 *
 * Hostname first — `assess.inovois.com` is Inovo, `security.<partner>.com` is
 * that partner — so a partner on their own domain never sees a URL prefix. The
 * `/p/[slug]` prefix is the fallback used before a custom domain is mapped, and
 * for previewing a partner brand from the Inovo site.
 */
export async function currentBrand(slug?: string): Promise<{ brand: Brand; basePath: string }> {
  const host = headers().get('host');
  if (slug) {
    const brand = await brandBySlug(slug);
    if (!brand) notFound();
    return { brand, basePath: `/p/${slug}` };
  }
  return { brand: await resolveBrand(host), basePath: '' };
}
