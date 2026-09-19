import type { Config } from 'tailwindcss';

/**
 * Tailwind is available for anything written after the port. The screens in
 * `components/generated/` carry the approved prototype's inline styles
 * verbatim — that is what makes them diffable against the reference — so they
 * do not use utilities, and preflight stays off so it cannot restyle them.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: 'var(--brand)',
        'brand-dark': 'var(--brand-dark)',
      },
      fontFamily: {
        sans: ['Figtree', '"Century Gothic"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
