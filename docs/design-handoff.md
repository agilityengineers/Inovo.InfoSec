# Handoff: Inovo Infosec — Assessment-Based Lead Generation Platform

Two white-label-ready assessment landing pages plus an admin, targeted at (1) MSPs and (2) MSP clients / Inovo's ICP. Deploy path: Claude Code → GitHub → Replit (production). Start with `CLAUDE_CODE_PROMPT.md` in this folder; this README is the spec it references.

## Overview

Inovo Infosec (inovois.com) is a CISO-led compliance/cybersecurity firm. This product is a self-scoring security assessment funnel:

1. **MSP Assessment** (`/`): sells Inovo to MSP owners in two directions — direct services, and a white-label partner program — using a 24-question "MSP Security Posture Assessment" as the lead magnet.
2. **Client Assessment** (`/assess` or partner subdomain): the assessment an MSP partner (or Inovo directly) puts in front of CIOs / CTOs / CISOs at regulated organizations. Single-vertical per brand (7 verticals), NIST CSF 2.0 spine, gated by a playbook offer, with hot/warm/nurture lead qualification.
3. **Admin**: leads, structured payloads, scoring/threshold config, brand (white-label) config, qualification rule, integration stubs (HubSpot, Zapier).

## About the design files — REPRODUCE EXACTLY, NO CHANGES

`reference/*.dc.html` are the approved prototypes. **The client has approved them as-is.** The production build must reproduce every screen, section, copy string, placeholder label, color, size, interaction, and state exactly as they appear in these files — including the **Build notes** page, the **Admin** views (Leads / Integrations / Scoring / Brand & CTA config / Qualification), the score preview blur, the validation messages, the illustrative partner economics, and every `[PLACEHOLDER — …]` marker. Do not "improve", reword, reorder, restyle, or omit anything. Where a decision is not covered by the reference, match the closest existing pattern in the reference rather than inventing one.

The only things that change are *implementation*: the prototype's runtime (`support.js`, `DCLogic`, `{{ }}` templates, `localStorage` as the database, stubbed integrations) is replaced by the production stack in `CLAUDE_CODE_PROMPT.md`. Port the data and pure functions from `reference/msp-logic.js` and `reference/client-logic.js` verbatim (questions, verticals, recommendations, scoring, qualification, payload shapes, copy tables) — they are the source of truth. The prototype-only dark control bar (brand/view/vertical switcher) becomes the dev-only/admin brand switcher; its functions (switch brand, switch vertical, reset) must still exist for the admin.

## Fidelity

**High-fidelity, approved.** Recreate visually and behaviorally 1:1 against the reference files opened side by side in a browser; treat any visible difference as a bug.

---

## Design tokens

**Brand (Inovo default)**
- Primary red `#C5131B`; hover/dark `#8f0d13` (derived: 72% of each channel)
- Ink `#111`; body text `#3a3a3e`; secondary `#555`/`#666`; muted `#777`/`#888`
- Dark section bg `#111214`; dark card `#1b1c20` border `#2a2b31`; dark body text `#b9bac0`; dark accent `#ff6b6b` / `#ff8080`
- Light section bg `#f6f6f7`; card border `#e6e6e9`; hairline `#e8e8ea` / `#eee`; input border `#cfcfd3`
- Status: gap `#b3121a`, watch `#b7791f`, strong `#1f7a3a`; qualification HOT `#b3121a`, WARM `#b7791f`, NURTURE `#4a5568`
- Prototype-only bar (`#15161a`, `#ffd166`) — **do not ship**; replace with real routing/auth.

**Brand is a runtime CSS variable.** Every brand-colored element uses `var(--brand)`; the root sets `--brand` from the active brand config. Sample partner primary `#0F4C81`.

**Typography:** Figtree (Google Fonts) 400/500/600/700/800; fallback "Century Gothic", system-ui. 
- H1 `clamp(34px,5vw,54px)` / 800 / lh 1.05 / ls -0.02em
- H2 `clamp(28px,4vw,40px)` / 800 / lh 1.1 / ls -0.02em
- Question `clamp(21px,3vw,27px)` / 800 / lh 1.25
- Eyebrow 12px / 700 / uppercase / ls .16em / brand color
- Body 17px (hero sub 19px), card body 15px, meta 13–14px, footnote 12px
- `text-wrap: pretty` on headlines

**Spacing:** section padding 72px 20px (hero 56/64); container max-width 1160px; card padding 26–36px; grid gap 18–20px; form gap 12px.
**Radius:** buttons 6px; inputs 6px; cards 12–16px; chips 999px; badges 4px.
**Shadow:** hero card only `0 20px 50px -30px rgba(0,0,0,.25)`.
**Buttons:** primary = brand bg, white text, 700, padding 15px 24px, min-height 48px (44px in header). Secondary = white bg, `1px solid #cfcfd3`. On dark = white bg, ink text.
**Hit targets:** ≥44px everywhere (mobile-first).

**Responsive:** no media queries in the prototype — everything uses `grid-template-columns: repeat(auto-fit, minmax(260–300px, 1fr))` and flex-wrap. Reproduce with the same approach or Tailwind equivalents; header nav wraps under logo on narrow widths.

---

## Screens — MSP Assessment (`MSP Assessment.dc.html`)

### 1. Landing (StoryBrand structure)
Header (white, hairline bottom): logo (44px tall, `assets/inovo-logo.png`), nav (Why now · The plan · Services · Partner program — anchors), primary CTA "Take the assessment".

Sections in order, copy is in the reference file — use it verbatim:
1. **Hero** — eyebrow "For managed service providers"; H1 "Your clients are asking for proof. Know your answer before they ask."; sub; CTAs: primary "Start the free assessment" + text link `brand.ctaDirectLabel` → `brand.ctaDirectUrl`; footnote "24 questions · no email needed to see your score…". Right card: "What the assessment measures" — 6 numbered domain rows.
2. **Trust strip** — "Inovo Infosec holds" SOC 2 Type II · HITRUST · ISO 27001 · ISO 9001 · Cyber AB RPO · MSSP Alert Top 250 (all approved by client).
3. **Problem** (dark) — H2 "Your security posture is your clients' security posture…"; 3 cards: Client demands / Compliance pressure / Liability.
4. **Guide** — H2 "You don't need to become a security company…"; 4 checkmark proof rows.
5. **Plan** (light gray) — "Assess. Remediate. Manage." 3 numbered cards; CTA.
6. **Stakes + proof** — 4 dash bullets; testimonial card (Blake White, President, Endurance IT Services — approved, trimmed one sentence) + `[PLACEHOLDER — partner logo row]`.
7. **Dual path** (`#direct`) — two cards side by side: **Direct** (white; service bullets; `[PLACEHOLDER — service packages & pricing]`; CTAs `ctaDirectLabel` + "Take the assessment first") and **White label / partner program** (dark; bullets; "See how the partnership works" + "Preview the white-label demo" → switches brand).
8. **Partner program** (`#partner`) — H2 "We do not compete with MSPs. We complete them."; 3 step cards (Brand it / Put it in front of clients / Co-deliver or refer); "What you get to brand as your own" list + link "See the client-facing assessment your clients would take →" (to Client Assessment); **Revenue & margin** card with 3 stats from `econ` config (marginPct %, referralPct %, minClients) labeled "Illustrative — set per partner agreement"; **Partner inquiry form** (dark card): name, company, work email, clients under management (select), interest (select), industries (text) → success state with "Book a partnership call" → `inovo.ctaPartnerUrl`.
9. **Final CTA** (brand bg) — "Seven minutes now, or the hard conversation later."
10. **Footer** — logo, address, phone, email, services list, 24/7 incident phone (brand color, 20px/800), © `brand.legalName`. Partner mode adds "Security program delivered with Inovo Infosec" when `poweredBy`.

### 2. Assessment flow (`/assessment`)
Gray page bg `#f6f6f7`; slim header (logo, "MSP Security Posture Assessment", Exit).
- **Intro card** — title "Where does your practice stand when a client asks for proof?", 6 domain chips, "Begin" (resumes at first unanswered question; shows "You have N answers saved").
- **Question** (one at a time, 24 total) — domain eyebrow (brand, uppercase) + "Question N of 24"; 6px progress bar (width = qIndex/24, `transition: width .3s`); white card: question (H2), optional help text, 4 radio-style option buttons (2px border `#dcdce0` → brand when selected; bg brand@7% when selected; 20px radio dot); validation line "Choose an answer to continue." (`#b3121a`) if Next with no answer; Back (disabled/40% opacity at Q1) and Next / "See my score" on last.
- **Score preview** — 190px ring (SVG circle r=52 stroke 10, dasharray = score/100 × 326.7, rotated -90°) with score overlaid in HTML (46px/800) and "OUT OF 100"; "Maturity level" + "Level N · Name" (brand); level summary; right: six domain bars **blurred** (`filter: blur(5px)`, aria-hidden); insight box "Your strongest domain is X. Your most exposed is Y."; CTA "Unlock my full report" → gate; "← Review my answers" → Q24.
- **Lead gate** — left: 64px score circle + level, "Where should we send your full report?", 4 checks; right form: Full name, Company, Work email, Role (select), Seats under management (select), Phone → "Show my full report". Validation below.
- **Full report** — header card (130px ring, "Level N · Name", "Prepared for {name}, {company}", level detail, 5-segment level scale); per-domain breakdown (name + "weight N", status pill Gap/Watch/Strong, 10px bar + %); recommendations (numbered, domain eyebrow, status pill, title, body, "Maps to: {service}") sorted by weighted exposure; dark next-step card ("Walk through this report with a CISO — 30 minutes, no pitch.", primary → `brand.ctaDirectUrl` with `brand.reportCtaLabel`, optional "Offer this assessment to my clients" → `#partner` when `showPartnerCta`, "Download PDF (stub)", "Retake assessment"); partner mode footer line "Assessment methodology and security program delivered with Inovo Infosec".

### 3. Admin (`/admin`, auth required in production)
Tabs: **Leads** (list rows: name · company, type badge Assessment/Partner, meta "Score · Level · seats · via brand", timestamp; right pane: JSON payload with "Push to HubSpot (stub)" / "Send to Zapier (stub)"; integration log), **Integrations** (HubSpot property mapping table, Portal ID; Zapier Catch Hook URL; list of other side-effects), **Scoring** (formula explanation; editable domain weights; editable level thresholds; gap/watch cutoffs; question bank with points), **Brand & CTA config** (Inovo: CTA labels/URLs, phone, email, partner economics; Partner: name, tagline, primary color, logo URL, CTAs, contact, address, `poweredBy`, `showPartnerCta`; live JSON of active brand).

### 4. Build notes (`/notes`) — internal page listing placeholders, assumptions, stubbed vs functional, production path. Keep as an internal doc, not a public route.

---

## Screens — Client Assessment (`Client Assessment.dc.html`)

Same visual system. Differences:

### Landing (vertical-tailored)
Header: logo, "{vertical.label} · Security Readiness Assessment", CTA "Get my score".
1. Hero — eyebrow "For {vertical.audience}", H1 `vertical.headline`, sub `vertical.subhead`, primary "Get my readiness score", footnote "24 questions · about 7 minutes · aligned to NIST CSF 2.0 · score shown before you share contact details". Right card "What you'll receive": score+tier, six CSF functions, `vertical.playbook`, advisory session.
2. Trust strip — label depends on brand: Inovo "Inovo Infosec holds"; partner+poweredBy "Program delivered with Inovo Infosec, which holds"; partner without poweredBy "Our security partner holds".
3. Problem (dark) — `vertical.problemHead/Body`; 3 pressure cards `{who, ask, why}`.
4. Guide — head/body differ by brand (partner: "{partner} keeps your systems running. Together with Inovo Infosec, we keep them defensible."); 4 proof rows incl. `vertical.guideProof`.
5. Plan — ARM with `vertical.framework` interpolated.
6. Stakes — `vertical.stakesHead`, 4 `vertical.stakes`; dark CTA card.
7. Footer — as MSP page.

### Flow
- Questions: eyebrow "{Function} · {desc}" (Govern / Identify / Protect / Detect / Respond / Recover); question text has tokens `{FW}` `{DATA}` `{AUD}` `{SYSTEMS}` replaced from the vertical.
- Preview: "Readiness tier" (Exposed / Developing / Established / Resilient); blurred six-function bars; CTA "Get my report + playbook".
- **Gate** (the playbook is the hook): "Where should we send your report and {playbook}?" Fields: Full name, Organization, Work email, Role (CIO/CTO/CISO…), Phone, Employees (select), Who handles security today (select), Frameworks required (multi-select chips: CMMC, NIST 800-171, HIPAA, SOC 2, ISO 27001, PCI DSS, GLBA/FFIEC, State privacy law, None yet), `vertical.deadlineLabel` (date), Timeline to act (30/90/180/none), Budget authority (own / shared / influence only), `vertical.sensitiveLabel` (Yes/No/Not sure). All required except frameworks & deadline. Routing note shown (co-delivery text in partner mode).
- **Report**: header (ring, tier, 4-segment tier scale), function breakdown (with descriptor), 7 recommendations (6 functions by exposure + final "Program" card "Readiness path for {framework}" → `vertical.readiness`; label "How {brand.name} helps:"), then two cards: **Playbook** (`vertical.playbook`, description, `[PLACEHOLDER — playbook PDF content per vertical]`, "Download the playbook (stub)", "Also sent to {email}") and **Talk it through** (dark; "30 minutes with an advisor who has built {framework} programs."; CTA `brand.reportCtaLabel` → `brand.ctaDirectUrl`; routing note; Retake).

### Client admin
Leads with HOT/WARM/NURTURE badge + reasons; editable qualification rule (4 numbers); per-brand vertical select + routing summary; payload JSON; notes.

---

## Data model & logic (port from `reference/*-logic.js`)

### Brand config (white-label layer) — one record per tenant
```ts
type Brand = {
  id: string; name: string; legalName: string; tagline: string;
  logo: string | null;            // URL; null → text mark (initials square + name)
  primary: string;                // hex → CSS --brand
  phone: string; incidentPhone: string; email: string; address: string;
  ctaDirectLabel: string; ctaDirectUrl: string;   // e.g. Calendly
  ctaPartnerUrl?: string;         // Inovo only
  reportCtaLabel: string;
  poweredBy: boolean;             // show "delivered with Inovo Infosec"
  showPartnerCta: boolean;        // MSP report: show partner-program CTA
  vertical?: VerticalId;          // client assessment: single vertical per brand
  routing: { model: 'direct' | 'co-delivery'; notify: string[] };
}
```
Resolve tenant by hostname (`assess.inovois.com` → inovo; `security.<partner>.com` → partner) or `/p/:slug`. Admin edits it; **nothing brand-related is hardcoded in components**.

### MSP assessment scoring
- 6 domains × 4 questions; each option 0–3 points (order in data = best→worst, points = 3 − index).
- `domainPct = points / 12 × 100`
- `score = Σ(domainPct × weight) / Σweights` rounded. Default weights: tooling 15, lifecycle 15, ir 20, compliance 15, vendor 15, proof 20.
- Levels (min score): 1 Initial 0 · 2 Reactive 30 · 3 Defined 50 · 4 Managed 70 · 5 Optimized 85.
- Domain status: gap < 50, watch < 75, else strong. Recommendation per domain = `RECS[domain][status]`, sorted by `(100 − pct) × weight` desc.
- Weights, thresholds, cutoffs are **admin-editable at runtime** (stored config, versioned).

### Client assessment scoring
- 6 CSF functions × 4 questions, 0–3 points, equal weights. `score = mean(functionPct)`.
- Tiers: Exposed 0 · Developing 40 · Established 60 · Resilient 80.
- 7 recommendations: 6 by exposure + fixed "Program" rec using `vertical.readiness`.
- Token substitution: `{FW}`→framework, `{DATA}`→data, `{AUD}`→auditor, `{SYSTEMS}`→systems.

### Lead qualification (client assessment)
```
urgencyDays = daysUntil(deadline) ?? {30d:30, 90d:90, 180d:180, none:9999}[timeline]
HOT     = score < hotScoreBelow(60) && urgencyDays <= hotDays(90) && budget != 'Influence only'
WARM    = score < warmScoreBelow(75) || urgencyDays <= warmDays(180)
NURTURE = otherwise
```
All four numbers admin-editable. HOT → HubSpot `lifecyclestage = salesqualifiedlead`.

### Submission payload (send to backend; backend fans out)
See `buildPayload()` in both logic files. Shape: `{type, submittedAt, brand, vertical?, source{host, utm, assessmentVersion}, contact{...}, qualification?{...}, assessment{score, level|tier, domains|functions[], answers[]}, recommendations[], playbook?, routing, integrations}`. Types: `assessment_lead`, `partner_inquiry`, `client_assessment_lead`.

### Validation
- Required fields as listed per form; email regex + reject personal domains `gmail|yahoo|hotmail|outlook|live|aol|icloud|proton(mail)`; phone ≥ 10 digits.
- Answers persist locally (resume); nothing is sent until the gate form submits.

### Analytics events
`assessment_started`, `question_answered`, `score_previewed`, `lead_captured`, `partner_inquiry`, `client_assessment_started`, `client_lead_captured` (+ UTM capture into payload).

---

## Integrations (stubbed in prototype → real in production, server-side only)
- **HubSpot**: `POST /crm/v3/objects/contacts` (upsert by email), then a Note with the summary. Property map: email, firstname/lastname, company, jobtitle, phone, plus custom `msp_seat_count`, `msp_assessment_score`, `msp_maturity_level`, `msp_domain_<id>_pct`, `lead_source_brand`, `assessment_vertical`, `lead_qualification`, `lifecyclestage`.
- **Zapier**: `POST` full payload JSON to Catch Hook URL from config.
- **Email**: transactional report + playbook PDF to prospect; internal alert to `routing.notify[]`.
- **PDF**: server-rendered, brand-themed report/playbook.

## Placeholders awaiting client (keep visibly labeled)
Service packages & pricing; partner economics (25/10/1 are illustrative); partner logo row; Calendly URLs (both brands); partner sample logo; playbook PDF content ×7 verticals; vertical copy review by Inovo practice leads.

## Assets
`reference/assets/inovo-logo.png` (horizontal, 361×113, white bg) — header/footer. `inovo-logo-stacked.png` (transparent) — optional for email/PDF. Font: Figtree via Google Fonts.

## Files
- `reference/MSP Assessment.dc.html` — MSP landing, assessment, admin, notes (prototype)
- `reference/Client Assessment.dc.html` — client-facing vertical assessment + admin (prototype)
- `reference/msp-logic.js`, `reference/client-logic.js` — extracted data + logic (source of truth for questions, copy tables, scoring, payloads)
- `reference/support.js` — prototype runtime only; ignore
- `CLAUDE_CODE_PROMPT.md` — the prompt to start Claude Code with
