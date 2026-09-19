/** Colour helpers for the runtime brand layer. */

/** `darken()` from the reference: 72% of each channel, used for `--brand-dark`. */
export function darken(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#8f0d13';
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.round(c * 0.72)).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}

/** Initials fallback used when a brand has no logo. */
export function initialsOf(name: string): string {
  return (name || 'P')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/**
 * WCAG contrast ratio against white. The admin warns below 4.5:1 so a partner
 * cannot pick a primary that makes their own button text unreadable.
 */
export function contrastOnWhite(hex: string): number {
  const l = relativeLuminance(hex);
  return Math.round(((1.05) / (l + 0.05)) * 100) / 100;
}

export const CONTRAST_FLOOR = 4.5;
