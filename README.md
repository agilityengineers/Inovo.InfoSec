# Inovo Infosec — Assessment-Based Lead Generation Platform

Two white-label-ready security assessments plus an admin, built from the
client-approved prototypes in [`reference/`](reference).

- **MSP Security Posture Assessment** (`/`, `/assessment`) — 24 questions across
  six domains, weighted scoring, five maturity levels.
- **Client Security Readiness Assessment** (`/assess`, `/assess/start`) — 24
  questions across the six NIST CSF 2.0 functions, tailored to one of seven
  verticals, with HOT/WARM/NURTURE lead qualification.
- **Admin** (`/admin`) — leads and their structured payloads, integration
  configuration, versioned scoring config, brand (white-label) config, the
  qualification rule, and the internal build notes.

The full design spec is [`docs/design-handoff.md`](docs/design-handoff.md); the
original build brief is [`docs/build-prompt.md`](docs/build-prompt.md).

---

## Running it locally

```bash
npm install
cp .env.example .env.local     # then fill in the values below
npm run dev                    # http://localhost:3000
```

The only variables you need to click through the whole funnel are the admin
credentials; everything else degrades gracefully:

```bash
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=something-long
ADMIN_SESSION_SECRET=$(openssl rand -base64 32)
```

Without `DATABASE_URL` the app runs against an in-memory store and logs a
warning — useful for a first look, but leads are lost on restart, and the app
refuses to start in production without it. With Postgres available:

```bash
export DATABASE_URL=postgres://...
npm run db:push     # create the tables
npm run db:seed     # brands, verticals, scoring config, qualification rule
```

### Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on `$PORT` (default 3000) |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest — scoring, qualification, payloads, validation |
| `npm run fidelity` | Diffs the built screens against the approved prototypes |
| `npm run generate` | Regenerates `lib/data/` and `components/generated/` |
| `npm run db:push` / `db:seed` | Schema and seed data |

---

## Deploying on Replit

1. **Import from GitHub.** In Replit, *Create Repl → Import from GitHub* and
   pick this repository. `.replit` and `replit.nix` are committed, so it opens
   as a Node 20 + Postgres 16 workspace with no further setup.

2. **Add the database.** Open the **Database** tool in the left sidebar and
   create a Postgres database. Replit sets `DATABASE_URL` for you.

3. **Add the secrets.** Open the **Secrets** tool and add, at minimum:

   | Secret | Notes |
   | --- | --- |
   | `ADMIN_EMAIL` | who can sign in at `/admin` |
   | `ADMIN_PASSWORD` | use a long random value |
   | `ADMIN_SESSION_SECRET` | `openssl rand -base64 32` |

   Then, as they become available: `HUBSPOT_ACCESS_TOKEN`, `ZAPIER_HOOK_URL`,
   `RESEND_API_KEY` with `EMAIL_FROM`, and `TURNSTILE_SECRET_KEY` with
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Every integration is skipped — and says so
   in the admin's integration log — until its key is present, so you can go live
   and connect them one at a time. `.env.example` lists all of them.

4. **Create the tables.** In the Shell:

   ```bash
   npm run db:push && npm run db:seed
   ```

5. **Run.** Press **Run**. The workspace serves on `$PORT`, which Replit
   forwards to the webview.

6. **Deploy.** *Deploy → Autoscale*. The build and run commands are already in
   `.replit` (`npm ci && npm run build`, then `npm run start`); the server binds
   `0.0.0.0:$PORT`, which is what Autoscale expects. Autoscale scales to zero
   between visits, which suits a lead-gen funnel.

### Mapping a custom domain per partner

Each brand owns a list of hostnames, and the tenant is resolved per request from
the `Host` header — so a partner on their own domain never sees a URL prefix.

1. In Replit, *Deployments → Settings → Custom domain*, add the hostname (for
   example `security.partnerdomain.com`) and create the DNS records it shows.
2. Add that hostname to the brand's `hostnames` list (see below).
3. Until DNS is live, the same tenant is reachable at `/p/<slug>` — which is
   also how you preview a partner brand from the Inovo site.

---

## Adding a partner brand

A brand is one row in `brands`; nothing brand-related is hardcoded in a
component. Every brand-coloured element reads `var(--brand)`, which the brand
provider publishes from the brand's `primary`.

The quickest route is the admin's **Brand & CTA config** tab. To seed one in
code instead, add it to `SEED_BRANDS` in `lib/data/brands.ts` and re-run
`npm run db:seed`:

```ts
'northstar': {
  id: 'northstar',
  slug: 'northstar-it',                       // → /p/northstar-it
  name: 'Northstar IT',
  legalName: 'Northstar IT, LLC',
  tagline: 'Managed IT & Security',
  logo: null,                                 // null → initials text mark
  primary: '#0F4C81',                         // → var(--brand)
  phone: '(555) 010-0100',
  incidentPhone: '(555) 010-0199',
  email: 'security@northstar-it.example',
  address: '…',
  ctaDirectLabel: 'Book a security review',
  ctaDirectUrl: 'https://calendly.com/…',
  reportCtaLabel: 'Book my advisory session',
  poweredBy: true,                            // "delivered with Inovo Infosec"
  showPartnerCta: false,
  vertical: 'hipaa',                          // one vertical per brand
  hostnames: ['security.northstar-it.com'],
  routing: { model: 'co-delivery', notify: ['security@northstar-it.example', 'sales@inovois.com'] },
  econ: { marginPct: 25, referralPct: 10, minClients: 1 },
},
```

Check the contrast warning after setting `primary`: the admin flags anything
below 4.5:1 against white, because the button text on it is white.

## Adding or changing a vertical

The seven verticals live in `reference/client-logic.js` and are extracted into
`lib/data/client.ts` by `npm run generate:data`; the seed loads them into the
`verticals` table. A vertical supplies the landing copy plus the four tokens
substituted throughout the questions and recommendations:

| Token | Field | Example (Defense / CMMC) |
| --- | --- | --- |
| `{FW}` | `framework` | CMMC Level 2 / NIST SP 800-171 |
| `{DATA}` | `data` | Controlled Unclassified Information (CUI) |
| `{AUD}` | `auditor` | a C3PAO assessor or your prime contractor |
| `{SYSTEMS}` | `systems` | your CUI environment |

To add one, add a record to `VERTICALS` with every field of the `Vertical` type,
re-run `npm run db:seed`, then point a brand at it (`vertical: '<id>'`) from the
admin's client tab. A test asserts that no token survives into rendered copy for
any vertical, so a missing field fails CI rather than shipping a literal `{FW}`.

---

## How the port works

The prototypes in `reference/` are client-approved, and the brief is to
reproduce them exactly. So the screens are not retyped — they are generated:

```
reference/*.dc.html  ──tools/generate-screens.mjs──▶  components/generated/*.tsx
reference/*-logic.js ──tools/extract-data.mjs─────▶  lib/data/*.ts
```

`tools/dc2jsx.mjs` rewrites the prototype's templating into JSX (`sc-if` →
conditional, `sc-for` → `map`, `style="…"` → a style object, `{{ x }}` → `{V.x}`)
and leaves every copy string and inline style declaration untouched.
`tools/extract-data.mjs` executes the reference logic files against a stubbed
runtime and serialises the question banks and copy tables, so a transcription
slip in 24 questions × 4 options × 2 assessments is impossible.

`npm run fidelity` then proves it, per screen:

```
ok    MspLanding     (1308 words, 953 style decls, 560 elements)
ok    MspAssessment  (338 words, 707 style decls, 350 elements)
ok    MspAdmin       (447 words, 678 style decls, 377 elements)
ok    MspNotes       (673 words, 78 style decls, 150 elements)
ok    ClientPage     (683 words, 1226 style decls, 697 elements)
ok    ClientAdmin    (298 words, 199 style decls, 118 elements)
```

It compares the visible text, every inline CSS declaration in order, and the
element sequence against the reference. CI runs it on every push, so a change
that alters the approved design fails the build. **Do not edit anything under
`components/generated/` or `lib/data/` by hand** — change the prototype or the
generator and re-run `npm run generate`.

The scoring engines are likewise tested *against* the reference rather than
against numbers copied out of it: `tests/scoring-*.test.ts` runs the prototype
logic in a sandbox and asserts identical scores, levels, tiers, statuses and
recommendation ordering across 480 answer sets.

## Architecture

```
app/                    routes: public funnel, /p/[slug] tenants, /admin, /api
components/generated/   the approved screens (generated — do not edit)
components/screens/     containers wiring view models to those screens
lib/data/               question banks, copy tables, verticals (generated)
lib/scoring/            pure score(), qualify(), tok()
lib/view-models/        ports of the prototype's renderVals()
lib/integrations/       HubSpot, Zapier, email, retry/backoff
db/                     Drizzle schema
tools/                  the generators and the fidelity checker
```

A visitor's answers live in `localStorage` (per assessment, per brand) so they
can resume; **nothing is sent until the gate form submits**. The server never
trusts a client-computed score — `/api/leads` re-scores from the answers, runs
the qualification rule, persists the lead, and only then fans out to HubSpot,
Zapier and email, logging every outcome to `integration_events`.

See [`CLAUDE.md`](CLAUDE.md) for the decisions behind this, the outstanding
placeholders, and suggestions deliberately not applied.
