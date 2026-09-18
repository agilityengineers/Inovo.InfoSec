# Prompt for Claude Code

Paste this as the opening message in Claude Code, run from a new empty repo that contains this handoff folder.

---

Build a production web app from the spec in `design_handoff_inovo_assessment/README.md`. The HTML files in `reference/` are the client-APPROVED prototypes. **Reproduce them exactly — no design, copy, layout, or behavior changes of any kind.** Every screen, section, placeholder label, Build-notes page, admin view, validation message, and interaction ships as-is; only the implementation stack changes. If something in the reference seems improvable, leave it and note it in `CLAUDE.md` under "Suggestions (not applied)". Port questions, copy tables, scoring, qualification, and payload builders from `reference/msp-logic.js` and `reference/client-logic.js`; ignore the prototype runtime (`support.js`, `DCLogic`, `{{ }}` templating).

## Target: Replit production (via GitHub)

**Stack (chosen for Replit Deployments):**
- Next.js 14+ (App Router, TypeScript), Tailwind CSS, React Server Components where sensible
- Postgres via Replit's built-in Postgres (Neon) using Drizzle ORM; `DATABASE_URL` from Replit secrets
- Auth for `/admin`: NextAuth (email magic link) or simple single-admin credentials via env — keep it swappable
- Email: Resend (or Postmark) via env key; PDF: `@react-pdf/renderer` server-side
- Deploy: Replit "Autoscale" deployment; `npm run build` / `npm start`; port from `process.env.PORT`
- Include `.replit` and `replit.nix` (or the Node template equivalents) so the repo imports cleanly into Replit, plus `.env.example` listing every secret

**Repo hygiene:** conventional commits, `README.md` with local + Replit setup, `CLAUDE.md` summarizing architecture/decisions, GitHub Actions CI (typecheck, lint, test).

## Architecture requirements

1. **Multi-tenant brand layer.** `brands` table (see `Brand` type in the spec). Resolve tenant per request by hostname → brand, falling back to `/p/[slug]`. Inject brand into a React context; every brand-colored element uses `var(--brand)` set on `<html>`/root. No brand strings hardcoded in components. Seed two brands: `inovo` (defaults in spec) and `msp-security-services` (sample partner).
2. **Two assessments, one engine.** `assessments` config table with versioned JSON: domains/functions, questions (options with points), weights, thresholds, status cutoffs, recommendations. Seed `msp-v1` and `client-v1` from the logic files. Scoring is a pure function `score(config, answers) → result` with unit tests reproducing the prototype's outputs.
3. **Verticals** table/JSON for the client assessment (7 records from `client-logic.js` `VERTICALS`), token substitution `{FW} {DATA} {AUD} {SYSTEMS}`. Brand has `verticalId`.
4. **Routes:**
   - `/` MSP landing · `/assessment` MSP flow (intro → 24 questions → preview → gate → report) · `/partner` anchors on landing
   - `/assess` client landing · `/assess/start` client flow · both driven by tenant brand
   - `/admin` (auth): leads, lead detail/payload, integrations config, scoring config (weights/thresholds/cutoffs editable, versioned), brand config (incl. logo upload to Replit Object Storage or base64 for v1), qualification rule, vertical per brand
   - `/api/leads` POST (validate with zod, persist, enqueue fan-out) · `/api/admin/*` (auth)
5. **Lead pipeline (server-side only):** persist `leads` (payload JSONB + indexed columns: type, brand, score, tier, qualification, email, createdAt). Fan-out after persist: HubSpot upsert (contact + note, custom properties from spec), Zapier webhook POST, prospect email with PDF, internal alert to `routing.notify[]`. Each integration behind a feature flag + env key; log outcomes to `integration_events` table shown in admin. Retry with backoff.
6. **Client state:** answers persisted in `localStorage` per assessment+brand for resume; cleared on retake. Nothing sent until gate submit. Capture UTM params into payload.
7. **Qualification:** implement the HOT/WARM/NURTURE rule with admin-editable thresholds; store computed tier on the lead; map HOT → HubSpot `lifecyclestage=salesqualifiedlead`.
8. **Forms:** zod schemas; work-email rule (reject gmail/yahoo/hotmail/outlook/live/aol/icloud/proton); phone ≥ 10 digits; inline errors as in the design; honeypot + Cloudflare Turnstile (env-gated).
9. **Accessibility & mobile:** ≥44px targets, radio-group semantics for options, focus moves to question on step change, contrast check on partner primary in admin (warn if < 4.5:1 on white).
10. **Placeholders:** keep every `[PLACEHOLDER — …]` string visible until replaced via admin/content config; list them in `CLAUDE.md`.

## Visual & behavioral fidelity — exact
Match the reference HTML 1:1: Figtree font, tokens, spacing, section order, every copy string and placeholder marker, blur on the score preview, validation text, button labels, admin tabs, Build-notes page content. Use the reference files as the acceptance criteria — open them side by side and diff visually at 375px, 768px, and 1280px. The dark "PROTOTYPE" control bar's functions (brand switch, view switch, vertical switch, reset) move into the admin / a dev-only switcher behind `NODE_ENV !== 'production'`; in production, brand resolves by tenant. Keep the Build notes page as an admin-only route (`/admin/notes`) with its content unchanged.

## Deliverables
- Working app with seeded brands/assessments/verticals, all flows navigable, admin functional
- Tests: scoring engine, qualification rule, payload builder, form validation
- `README.md` with: Replit import steps (Import from GitHub → set secrets → Run → Deploy Autoscale), custom-domain mapping per partner, how to add a partner brand and a vertical
- Push to GitHub on `main`; open a PR per milestone (scaffold → brand layer → MSP flow → client flow → admin → integrations → polish)

Work milestone by milestone; after each, run typecheck/lint/tests and summarize what's done vs. remaining.
