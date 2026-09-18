'use client';

/**
 * Brand (tenant) context.
 *
 * The tenant is resolved on the server — by hostname, else by the `/p/[slug]`
 * prefix — and handed to the tree here. Components never reach for a brand
 * string directly: they read `useBrand()`, and every brand-coloured element
 * uses `var(--brand)`, which the provider publishes on the wrapper element.
 */

import { createContext, useContext, useMemo } from 'react';
import { darken, initialsOf } from '@/lib/color';
import type { Brand } from '@/lib/types';
import type { BrandView } from '@/lib/view-models/types';

const BrandContext = createContext<BrandView | null>(null);

/**
 * URL prefix for the active tenant: empty when the brand was resolved from the
 * hostname, `/p/<slug>` when it was resolved from the path. Every internal link
 * is built through this so a partner preview keeps its prefix.
 */
const BasePathContext = createContext<string>('');

export function toBrandView(brand: Brand): BrandView {
  return {
    ...brand,
    primaryDark: darken(brand.primary),
    primarySoft: brand.primary + '14',
    hasLogo: !!brand.logo,
    noLogo: !brand.logo,
    initials: initialsOf(brand.name),
  };
}

export function BrandProvider({
  brand,
  basePath = '',
  children,
}: {
  brand: Brand;
  basePath?: string;
  children: React.ReactNode;
}) {
  const view = useMemo(() => toBrandView(brand), [brand]);
  return (
    <BrandContext.Provider value={view}>
      <BasePathContext.Provider value={basePath}>
      <div
        style={
          {
            '--brand': view.primary,
            '--brand-dark': view.primaryDark,
            '--brand-soft': view.primarySoft,
            minHeight: '100vh',
            background: '#fff',
            color: '#111',
            lineHeight: 1.5,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
      </BasePathContext.Provider>
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandView {
  const brand = useContext(BrandContext);
  if (!brand) throw new Error('useBrand must be used inside a <BrandProvider>');
  return brand;
}

export function useBasePath(): string {
  return useContext(BasePathContext);
}
