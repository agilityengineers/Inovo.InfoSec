# CLAUDE.md — architecture, decisions, and what is still open

Working notes for anyone picking this up. The user-facing setup guide is
[`README.md`](README.md); the approved design is [`reference/`](reference) and
the spec is [`docs/design-handoff.md`](docs/design-handoff.md).

---

## The one rule

`reference/*.dc.html` are **client-approved**. The brief is to reproduce them
exactly — every screen, copy string, colour, placeholder marker, validation
message and interaction. Any visible difference is a bug.

Everything below follows from that.

## How fidelity is kept, not just claimed

Retyping ~1,600 lines of densely inline-styled markup would lose copy and style
declarations silently, and no reviewer would catch it. So the screens and the
data are generated from the reference and continuously diffed against it:

| Generated | From | By |
| --- | --- | --- |
| `components/generated/*.tsx` | the prototype HTML | `tools/generate-screens.mjs` (via `tools/dc2jsx.mjs`) |
| `lib/data/msp.ts`, `client.ts`, `brands.ts` | the prototype logic files | `tools/extract-data.mjs` |

`tools/dc2jsx.mjs` is a small transliterator: `sc-if` → a conditional, `sc-for`
→ `.map()`, `style="a:b"` → a style object, `{{ x }}` → `{V.x}`. It does not
touch copy or CSS values. `tools/extract-data.mjs` executes the reference logic
in a `node:vm` sandbox and serialises what it finds, so the question banks and
copy tables cannot drift by transcription.

`npm run fidelity` compares, per screen: the visible text, every inline CSS
declaration in order, and the element sequence. CI runs it, plus a check that
re-running the generators produces no diff.

**Never edit `components/generated/` or `lib/data/` by hand.** Change the
prototype or the generator, run `npm run generate`, then `npm run fidelity`.

### The contract between the two

The generated screens read a view model named `V`, whose shape mirrors
`renderVals()` in the reference logic files (`V.brand.primary`, `V.stage.gate`,
`V.leadErr.email`, …). `lib/view-models/types.ts` declares those shapes and is
effectively a published interface — renaming a field there means regenerating.

The hooks in `lib/view-models/` are the ports of `renderVals()`, with the
prototype's `localStorage`-as-a-database swapped for the real pipeline.

## Request flow

```
Host header ──▶ resolveBrand() ──▶ BrandProvider sets --brand ──▶ screens
   │                                        │
   └── else /p/[slug]                       └── useMspVals / useClientVals
                                                        │
answers in localStorage (resume) ───────────────────────┤
                                                        ▼
                                          POST /api/leads (zod, Turnstile)
                                                        │
                                   re-score · qualify · persist lead
                                                        │
                                      fan out ─▶ HubSpot · Zapier · email
                                                        │
                                              integration_events ─▶ admin
```

## Decisions worth knowing

**Inline styles, not Tailwind utilities, in the ported screens.** Tailwind is
installed and configured for anything written after the port, but the approved
screens carry the prototype's inline styles verbatim — that is precisely what
makes them diffable against the reference. Tailwind's preflight is disabled so
it cannot restyle them.

**The server never trusts a client-computed score.** The browser posts answers;
`/api/leads` re-scores with the active config, runs the qualification rule, and
builds the payload. The optimistic report the visitor sees is rendered from the
same pure functions, so the two agree.

**Scoring config is versioned, not mutated.** Saving in the admin writes a new
row in `assessments` and deactivates the previous one, so a lead scored last
month can still be explained.

**Production fails fast on missing configuration.** `instrumentation.ts` runs
`validateEnv()` once at server start; a production deployment without
`DATABASE_URL`, `ADMIN_SESSION_SECRET`, `ADMIN_EMAIL` or `ADMIN_PASSWORD`
refuses to boot and names what is missing. The alternative — serving the public
pages happily and only failing when a lead is submitted — loses leads silently.

**Schema changes ship as versioned migrations.** `db/migrations/*.sql` is
committed and applied in order by `npm run db:migrate`; `npm run db:generate`
writes a new one after a schema edit. `db:push` remains for development only.
Migrations are deliberately not wired into the Autoscale build — see `.replit`.

**`/api/health` probes the database directly.** It deliberately does not use the
ordinary reads, because those fall back to seed data and would report "ok"
straight through an outage. It returns 503 with the reason instead, and
`servingSeedFallback: true` to say the site is up but persisting nothing.

**Reads fall back to seed data; writes do not.** If Postgres is unreachable, the
public funnel still renders from `lib/data/` rather than 500-ing — every string
it needs is compiled in. A lead that cannot be persisted fails loudly instead.
Without `DATABASE_URL` at all, development uses an in-memory store and warns;
production refuses to start.

**Integrations are individually gated.** Each of HubSpot, Zapier and email needs
a feature flag (`INTEGRATION_*`, default on) *and* its key. Missing keys are
recorded as `skipped` in the integration log rather than failing the submission,
so the funnel can go live before the CRM work lands. Each retries with
exponential backoff, and the fan-out runs only after the lead is safely stored.

**Auth is deliberately small and swappable.** A single admin credential from env
in a signed, httpOnly cookie (`lib/auth.ts`). Moving to NextAuth with an email
magic link means reimplementing `currentSession()` and `signIn()`; nothing that
calls `requireAdmin()` changes.

**The prototype control bar does not ship.** Its functions move into the admin
chrome (view switch, brand and vertical config, sign out), with a brand preview
switcher rendered only when `NODE_ENV !== 'production'`. In production the brand
resolves per tenant.

**Build notes are admin-only** at `/admin/notes`, content unchanged, as the spec
asks — an internal document, not a public route.

## Deliberate deviations from the reference

Three, all documented here because the rule above is otherwise absolute:

1. **Link colour is `var(--brand, #C5131B)`, not `#C5131B`.** The prototype
   hardcodes Inovo's red in its global stylesheet, which would leak into every
   partner tenant. The fallback renders identically for Inovo.
2. **`style-hover` is implemented, for unselected options only.** The approved
   markup carries `style-hover="border-color:#9a9aa0"` on the answer buttons,
   but the prototype runtime never implemented it, so it is inert in the
   reference. It is authored intent, so it is honoured — scoped so a selected
   option keeps the brand border the reference shows. If the client wants the
   reference's literal behaviour, delete that rule from `app/globals.css`.
3. **"Download PDF (stub)" actually downloads a PDF.** The label is approved
   copy and is unchanged, but the button is wired to the real server-rendered
   report rather than an `alert()`. Worth confirming the client wants the label
   updated once they see it working.

Two additions sit outside the approved markup and change nothing visible:
focus moves to the question heading on step change (`useFocusOnStep`), and an
invisible Turnstile widget renders in a hidden container when a site key is set.

## Placeholders awaiting client input

Kept visible, exactly as approved. Each is content, not code — replacing them is
a copy change plus, where noted, a brand or vertical field.

| Placeholder | Where | Replace by |
| --- | --- | --- |
| `[PLACEHOLDER — service packages & pricing tiers…]` | MSP landing, Direct card | editing the prototype and regenerating |
| `[PLACEHOLDER — partner logo row: 4–6 MSP partner logos with permission]` | MSP landing, proof card | as above, once logos are cleared |
| `[PLACEHOLDER — playbook PDF content per vertical, to be authored by Inovo]` | client report, playbook card | authoring seven playbooks; also appears in the generated PDF |
| `[PLACEHOLDER — partner address]` | sample partner brand | the admin's Brand & CTA config |
| `https://calendly.com/PLACEHOLDER-inovo/discovery` | `ctaDirectUrl` | admin → Brand & CTA config |
| `https://calendly.com/PLACEHOLDER-inovo/partnership` | `ctaPartnerUrl` | as above |
| `https://calendly.com/PLACEHOLDER-partner/review` | partner `ctaDirectUrl` | as above |

Also outstanding from the spec, not marked in the UI: the partner economics
(25 / 10 / 1) are labelled illustrative and are per-brand `econ` values, and the
vertical copy still wants review by Inovo's practice leads.

## Suggestions (not applied)

Recorded rather than acted on, because the design is approved. Each is a
judgement call for the client, not a defect.

1. **The score preview blurs the domain bars with `filter: blur(5px)`.** The
   values are still in the DOM, so anyone can read them from dev tools or by
   disabling CSS. If the gate is meant to be a real gate rather than a
   friction point, the server should withhold the per-domain numbers until the
   lead form is submitted. The bars are `aria-hidden`, so screen-reader users
   already get the intended experience.
2. **The MSP assessment has no "Exit" confirmation.** Exiting mid-run returns to
   the landing page; answers are saved and the intro offers to resume, but a
   visitor at question 23 gets no warning.
3. **`{{ brand.ctaDirectUrl }}` links open with `target="_blank"` without
   `rel="noopener"`.** Reproduced as-is. Modern browsers imply `noopener` for
   `target="_blank"`, so this is now cosmetic, but it is worth a one-line fix
   next time the prototype is edited.
4. **The client gate asks for eleven fields.** It is the heaviest form in the
   funnel and sits between the score and the playbook. If completion rates
   disappoint, "Frameworks required" and the deadline are already optional and
   the natural candidates for a second step.
5. **Question help text is only rendered when non-empty, but is not associated
   with the radio group.** Adding `aria-describedby` would read it to screen
   readers at the point it matters. Not applied because it touches the approved
   markup.
6. **Level thresholds and gap/watch cutoffs are editable independently.** The
   admin does not stop you setting `gapBelow` above `watchBelow`, or level
   minimums out of order. The scoring code handles it without crashing (levels
   are sorted before matching), but the resulting labels would be nonsense. A
   validation pass on the Scoring tab would be cheap.
7. **Seven verticals share one 24-question bank.** That is what makes the copy
   tokens work, and it is the right call for v1. If a vertical ever needs its
   own question, the config table is already versioned per assessment key and
   could carry a per-vertical override.

## Testing

`npm test` covers what the spec asks for — the scoring engine, the qualification
rule, the payload builders and form validation — but the first two are worth a
note: rather than asserting numbers copied out of the prototype, they load the
reference logic in a sandbox and assert the port produces *identical* output
across 480 generated answer sets, every vertical included. If the port ever
drifts from the approved behaviour, those tests fail with a concrete case.

`npm run fidelity` does the same job for the markup.
