// Reference: logic class from MSP Assessment.dc.html (prototype runtime). Port the data + pure functions; drop DCLogic/React glue.

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.LS = 'inovo-msp-proto:';
    this.DOMAINS = [
      { id: 'tooling', name: 'Tooling & Stack Maturity', blurb: 'MFA, privileged access, EDR, RMM hardening' },
      { id: 'lifecycle', name: 'Client Onboarding & Offboarding', blurb: 'Baselines, access removal, contract clarity' },
      { id: 'ir', name: 'Incident Response Readiness', blurb: 'Plans, partners, backups, insurance' },
      { id: 'compliance', name: 'Compliance Obligations', blurb: 'CMMC, HIPAA, SOC 2 — for clients and for you' },
      { id: 'vendor', name: 'Vendor & Supply-Chain Risk', blurb: 'Your stack, your subcontractors, your inventory' },
      { id: 'proof', name: 'Proof & Evidence', blurb: 'What happens when a client asks you to prove it' }
    ];
    const Q = (d, text, help, opts) => ({ d, text, help, options: opts.map((label, i) => ({ label, points: 3 - i })) });
    this.QUESTIONS = [
      Q('tooling', 'How is MFA enforced for your own staff on admin tools — RMM, PSA, M365/Google admin, documentation?', 'Answer for how it works today, not policy.', ['Enforced everywhere; phishing-resistant (FIDO2/passkeys) for admin roles', 'Enforced on most tools; SMS or app-based', 'Enabled but optional or inconsistent by tool', 'Not enforced, or not sure']),
      Q('tooling', 'How do your technicians access privileged accounts in client environments?', 'Think domain admin, M365 global admin, firewall logins.', ['Per-tech accounts, PAM/vault with just-in-time elevation, sessions logged', 'Per-tech accounts in a shared vault, reviewed periodically', 'Shared credentials in a password manager', 'Shared credentials in spreadsheets, docs, or memory']),
      Q('tooling', 'What endpoint protection covers your own MSP systems and your clients?', '', ['EDR/MDR on everything, monitored 24/7', 'EDR deployed, monitored during business hours', 'Traditional antivirus only', 'Inconsistent — coverage unknown on some endpoints']),
      Q('tooling', 'How is your RMM and remote-access tooling hardened?', 'RMM compromise is the most common path into MSP client bases.', ['Hardened to vendor/CIS baseline, IP-restricted, patched within days, reviewed quarterly', 'Patched promptly, MFA on, default config otherwise', 'Default configuration, patched eventually', "Not sure how it's configured"]),
      Q('lifecycle', 'When you onboard a new client, is there a documented security baseline you apply?', '', ['Documented baseline mapped to CIS/NIST, signed off by the client', 'Documented internal checklist', 'Informal — varies by technician', 'No baseline']),
      Q('lifecycle', 'When a client leaves, how are your agents, credentials, and access removed?', '', ['Same day, checklist-driven, verified and documented', 'Within a week, using a checklist', 'Eventually, ad hoc', "We don't have a process"]),
      Q('lifecycle', 'When a technician leaves your MSP, how quickly is their access to every client environment revoked?', '', ['Same day — central identity, automated, verified', 'Within 24–48 hours via manual checklist', 'Within a week or two', 'Uncertain — depends who remembers']),
      Q('lifecycle', 'Do your client agreements define who owns which security responsibilities?', 'Yours vs. theirs vs. a third party.', ['Yes — responsibility matrix reviewed by counsel, in every MSA', 'Yes, in most contracts', 'Vague language only', 'No']),
      Q('ir', 'Do you have a written incident response plan for your own MSP — not just for clients?', '', ['Yes, tabletop-tested in the last 12 months', 'Yes, but never tested', 'Draft or informal', 'No']),
      Q('ir', 'A client is hit with ransomware tonight. Who leads?', '', ['Named IR lead, retained IR/forensics partner, call tree ready', 'Internal lead, no external partner on retainer', "We'd figure it out quickly", 'Not sure']),
      Q('ir', 'How confident are you in restoring from backups — for clients and for your own systems?', '', ['Immutable/offline copies, restores tested quarterly, RTO/RPO documented', 'Restores tested annually', 'Backups exist; restores rarely tested', 'Not confident']),
      Q('ir', 'Do you know what your cyber insurance policy requires of you — and do you meet it?', '', ['Yes — requirements mapped to controls, evidence ready', 'Insured, mostly compliant', "Insured, haven't checked the requirements", 'No coverage, or not sure']),
      Q('compliance', 'When clients face CMMC, HIPAA, SOC 2, or PCI, how prepared are you to support them?', '', ['Documented support for multiple frameworks, with a partner for governance', 'Documented support for one or two frameworks', 'We handle it case by case', "Haven't been asked yet, or not sure"]),
      Q('compliance', 'Does your MSP hold its own third-party attestation (SOC 2, ISO 27001, CMMC)?', '', ['Yes, current', 'In progress', 'Planned within 12 months', 'No']),
      Q('compliance', 'Are your own policies — access control, acceptable use, change management, vendor management — written, approved, and reviewed annually?', '', ['Complete set, reviewed annually, staff attest', 'Most written; review is irregular', 'A few documents', 'None']),
      Q('compliance', 'BAAs, DFARS flow-down clauses, or similar you have signed with clients — do you know what they commit you to?', '', ['Yes — tracked in a register with mapped controls', 'Signed and loosely tracked', 'Signed some; not tracked', "Not sure what we've signed"]),
      Q('vendor', 'Do you assess the security of your own critical vendors — RMM, PSA, backup, EDR, documentation?', '', ['Formal annual review, SOC reports collected, vendor register maintained', 'Reviewed at onboarding only', 'We rely on vendor reputation', 'No']),
      Q('vendor', 'How do you learn about vendor breaches or critical CVEs in your stack?', '', ['Subscribed advisories plus a defined response SLA', 'We monitor advisories; response is ad hoc', 'News and social media', 'Usually after the fact']),
      Q('vendor', 'Do you maintain a current hardware/software/SaaS inventory for your MSP and each client?', '', ['Automated, current, includes SaaS', 'Maintained, mostly current', 'Partial', 'No']),
      Q('vendor', 'Subcontractors or third parties that touch client environments (NOC, help desk, project work) — how are they controlled?', '', ['Vetted, contractually bound, access monitored', 'Contracts in place, limited monitoring', 'Informal arrangements', "We don't track this"]),
      Q('proof', 'A client or prospect sends a security questionnaire. What happens?', '', ['Standard answer library plus evidence pack — turned around in days', 'We answer from memory; usually accurate', 'We scramble each time', 'We avoid or delay them']),
      Q('proof', "Could you produce evidence today — logs, policies, access reviews — for a client's auditor?", '', ['Yes, organized in a GRC platform', 'Yes, scattered across tools', 'Some, with effort', 'No']),
      Q('proof', 'How often do you review who has access to what across client environments?', '', ['Quarterly, documented, exceptions remediated', 'Annually', 'When something prompts it', 'Never']),
      Q('proof', "Has an independent third party assessed your MSP's security in the last 12 months?", 'Pen test, risk assessment, or maturity assessment.', ['Yes — findings remediated', 'Yes — findings partially addressed', 'More than a year ago', 'Never'])
    ];
    this.RECS = {
      tooling: { gap: ['Harden the tools that hold the keys', 'Your RMM, PSA, and admin identities are the highest-value targets in your practice. Enforce phishing-resistant MFA for admin roles, move privileged access into a vault with per-tech accounts, and baseline your RMM to CIS.', 'CIS Benchmark Hardening + Security Maturity Level Assessment'], watch: ['Close the gaps in privileged access', 'Coverage is uneven. Standardize EDR across every endpoint and formalize a quarterly configuration review of your RMM and remote-access tooling.', 'CIS Benchmark Hardening'], strong: ['Keep your stack hardened', "Your tooling controls are mature. Fold them into a managed program so configuration drift and new tools don't erode them.", 'Managed Cybersecurity (Manage phase)'] },
      lifecycle: { gap: ['Build a client lifecycle baseline', 'Onboarding and offboarding are where access lingers and liability accrues. Create a documented security baseline, a same-day offboarding checklist for clients and technicians, and a responsibility matrix in your MSA.', 'MSP Cyber Consulting & Training'], watch: ['Formalize responsibilities in your contracts', 'Your process exists but your paper may not protect you. Add a reviewed responsibility matrix to every agreement and verify access removal rather than assuming it.', 'MSP Cyber Consulting & Training + Cybersecurity Policy Workshop'], strong: ['Lifecycle controls are defensible', 'Keep the evidence: retain completed offboarding checklists and access-removal verification per client.', 'Managed Cybersecurity (Manage phase)'] },
      ir: { gap: ['Get incident-ready before the call comes', 'Without a tested plan, a named lead, and verified restores, a client incident becomes your incident. Write and tabletop an IR plan for the MSP itself, retain an IR partner, and test immutable restores quarterly.', 'Incident Response Planning + 24/7 IR & Recovery'], watch: ['Test what you have', 'A plan that has never been exercised is a hypothesis. Run a tabletop this quarter, test restores, and map your cyber-insurance requirements to real controls.', 'Incident Response Planning'], strong: ['Response readiness is a selling point', "Document it for clients and insurers. You can answer 'who leads' with a name — most MSPs cannot.", 'Managed Cybersecurity (Manage phase)'] },
      compliance: { gap: ['Get out of the compliance gray zone', 'Clients in regulated industries will hold you inside their boundary whether or not you are ready. Establish a policy set, track what you have signed, and start toward your own attestation with CISO-level ownership.', 'vCISO Services + SOC 2 / ISO 27001 / CMMC Readiness'], watch: ['Turn effort into attestation', 'You are doing much of the work without the credential. A readiness engagement converts existing controls into audit-ready evidence and a certificate you can put in front of prospects.', 'SOC 2 / ISO 27001 Readiness, Remediation & Auditing'], strong: ['Maintain and leverage your attestation', 'Keep your program current with annual review cycles and use it to win regulated clients who are leaving less-prepared MSPs.', 'Managed Compliance (Manage phase)'] },
      vendor: { gap: ['Know your supply chain', 'Your clients inherit every vendor risk you carry. Stand up a vendor register, collect SOC reports for critical tools, subscribe to advisories with a response SLA, and inventory what you actually run.', 'Risk Assessment (incl. vendor & supply-chain review)'], watch: ['Tighten vendor oversight', 'Move from onboarding-only review to an annual cycle, and bring subcontractor access under monitoring.', 'Risk Assessment'], strong: ['Vendor risk is under control', 'Keep the register current and include vendor review in your annual risk assessment.', 'Managed Cybersecurity (Manage phase)'] },
      proof: { gap: ['Be able to prove it', "This is where deals stall and audits fail. Build a questionnaire answer library, centralize evidence in a GRC platform, institute quarterly access reviews, and get an independent assessment on record.", 'vCISO Services + Security Maturity Level Assessment (GRC platform)'], watch: ['Organize the evidence you already have', 'You can produce proof, but slowly. Centralizing policies, logs, and reviews in one place turns a scramble into a same-week response.', 'Security Maturity Level Assessment + GRC platform onboarding'], strong: ['Proof is a competitive advantage', 'Put your evidence pack in front of prospects proactively — it shortens sales cycles with regulated clients.', 'Managed Compliance (Manage phase)'] }
    };
    this.DEFAULT_SCORING = { weights: { tooling: 15, lifecycle: 15, ir: 20, compliance: 15, vendor: 15, proof: 20 }, levels: [ { n: 1, name: 'Initial', min: 0 }, { n: 2, name: 'Reactive', min: 30 }, { n: 3, name: 'Defined', min: 50 }, { n: 4, name: 'Managed', min: 70 }, { n: 5, name: 'Optimized', min: 85 } ], gapBelow: 50, watchBelow: 75 };
    this.LEVEL_TEXT = {
      1: ['Security depends on individual effort, not a program.', 'Controls exist where a technician cared enough to set them up. Nothing is documented, tested, or provable. A client questionnaire, an insurer, or an incident would expose the gaps quickly.'],
      2: ['You respond to security demands as they arrive.', 'Some controls are in place and some paperwork exists, but coverage is inconsistent and evidence is scattered. You can answer questions — after a scramble.'],
      3: ['A defined program exists; it is not yet proven.', 'Policies and baselines are written and mostly followed. The gap is verification: testing, independent assessment, and organized evidence.'],
      4: ['You run a managed security practice.', 'Controls are documented, reviewed, and largely evidenced. Attestation or a final set of tested processes would make the program fully defensible.'],
      5: ['Your practice operates at the level clients and auditors expect of a security partner.', 'Documented, tested, independently verified, and provable on request. The opportunity now is to sell it.']
    };
    this.DEFAULT_BRANDS = {
      inovo: { id: 'inovo', name: 'Inovo Infosec', legalName: 'Inovois InfoSec, Inc', tagline: 'Three Dimensional Cybersecurity', logo: 'assets/inovo-logo.png', primary: '#C5131B', phone: '800-598-4008 + option 1', incidentPhone: '800-598-4008 + option 1', email: 'sales@inovois.com', address: '515 S Flower Street, 18th Floor, Los Angeles, CA 90071', ctaDirectLabel: 'Book a discovery call', ctaDirectUrl: 'https://calendly.com/PLACEHOLDER-inovo/discovery', ctaPartnerUrl: 'https://calendly.com/PLACEHOLDER-inovo/partnership', reportCtaLabel: 'Review my results with a CISO', poweredBy: false, showPartnerCta: true },
      partner: { id: 'partner', name: 'MSP Security Services', legalName: 'MSP Security Services, LLC', tagline: 'Managed IT & Security', logo: '', primary: '#0F4C81', phone: '(555) 010-0100', incidentPhone: '(555) 010-0199', email: 'security@mspsecurityservices.example', address: '[PLACEHOLDER — partner address]', ctaDirectLabel: 'Book a security review', ctaDirectUrl: 'https://calendly.com/PLACEHOLDER-partner/review', ctaPartnerUrl: '', reportCtaLabel: 'Book my security review', poweredBy: true, showPartnerCta: false }
    };
    this.DEFAULT_ECON = { marginPct: 25, referralPct: 10, minClients: 1 };
    const load = (k, d) => { try { const v = localStorage.getItem(this.LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    this.state = {
      view: 'landing', brandId: 'inovo', stage: 'intro', qIndex: 0, showValidation: false,
      answers: load('answers', {}),
      lead: { name: '', email: '', company: '', role: '', seats: '', phone: '' }, leadErr: {},
      pf: { name: '', company: '', email: '', clients: '', interest: '', industries: '' }, pfErr: {}, partnerSent: false,
      leads: load('leads', []), selectedLeadId: null, integrationLog: [], adminTab: 'leads',
      scoring: load('scoring', this.DEFAULT_SCORING), brands: load('brands', this.DEFAULT_BRANDS), econ: load('econ', this.DEFAULT_ECON),
      cfg: load('cfg', { hubspotPortal: '', zapierHook: '' })
    };
  }
  save(k, v) { try { localStorage.setItem(this.LS + k, JSON.stringify(v)); } catch (e) {} }
  track(ev, data) { console.log('[analytics]', ev, data || {}); }
  darken(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#8f0d13'; const n = parseInt(m[1], 16); const f = c => Math.max(0, Math.round(c * .72)).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); }
  // ---- scoring ----
  compute(answers, scoring) {
    const s = scoring || this.state.scoring;
    const doms = this.DOMAINS.map(d => {
      const qs = this.QUESTIONS.map((q, i) => ({ q, i })).filter(x => x.q.d === d.id);
      const raw = qs.reduce((a, x) => a + (answers[x.i] != null ? x.q.options[answers[x.i]].points : 0), 0);
      const max = qs.length * 3;
      const weight = Number(s.weights[d.id]) || 0;
      return { id: d.id, name: d.name, raw, max, pct: Math.round(raw / max * 100), weight };
    });
    const wsum = doms.reduce((a, d) => a + d.weight, 0) || 1;
    const score = Math.round(doms.reduce((a, d) => a + d.pct * d.weight, 0) / wsum);
    const lv = [...s.levels].sort((a, b) => b.min - a.min).find(l => score >= Number(l.min)) || s.levels[0];
    const status = p => p < s.gapBelow ? 'gap' : p < s.watchBelow ? 'watch' : 'strong';
    doms.forEach(d => { d.status = status(d.pct); });
    const recs = doms.map(d => { const r = this.RECS[d.id][d.status]; return { domain: d.name, domainId: d.id, status: d.status, title: r[0], body: r[1], service: r[2], exposure: (100 - d.pct) * d.weight }; }).sort((a, b) => b.exposure - a.exposure);
    return { doms, score, level: { n: lv.n, name: lv.name }, recs };
  }
  buildPayload(lead, answers, brand, type) {
    const r = this.compute(answers);
    return {
      type: type || 'assessment_lead', submittedAt: new Date().toISOString(),
      brand: { id: brand.id, name: brand.name }, source: { host: 'assess.inovois.com', utm: null, assessmentVersion: '1.0' },
      contact: { name: lead.name, email: lead.email, company: lead.company, role: lead.role, seatCount: lead.seats, phone: lead.phone },
      assessment: { score: r.score, level: r.level, domains: r.doms.map(d => ({ id: d.id, name: d.name, points: d.raw, max: d.max, pct: d.pct, weight: d.weight, status: d.status })),
        answers: this.QUESTIONS.map((q, i) => ({ id: 'q' + (i + 1), domain: q.d, question: q.text, answer: answers[i] != null ? q.options[answers[i]].label : null, points: answers[i] != null ? q.options[answers[i]].points : null })) },
      recommendations: r.recs.map(x => ({ domain: x.domainId, status: x.status, title: x.title, service: x.service })),
      integrations: { hubspot: { status: 'stubbed', endpoint: 'POST /crm/v3/objects/contacts', portalId: this.state.cfg.hubspotPortal || null }, zapier: { status: 'stubbed', hook: this.state.cfg.zapierHook || null } }
    };
  }
  log(target, msg) { const color = target === 'HubSpot' ? '#c25a3a' : target === 'Zapier' ? '#c23a00' : '#555'; this.setState(s => ({ integrationLog: [{ when: new Date().toLocaleTimeString(), target, msg, color }, ...s.integrationLog].slice(0, 30) })); }
  fireStubs(p) {
    this.log('HubSpot', `would POST contact ${p.contact.email || '(no email)'} · score ${p.assessment.score} · ${p.type}` + (this.state.cfg.hubspotPortal ? ` → portal ${this.state.cfg.hubspotPortal}` : ' (no portal configured)'));
    this.log('Zapier', `would POST ${JSON.stringify(p).length} bytes JSON` + (this.state.cfg.zapierHook ? ` → ${this.state.cfg.zapierHook}` : ' (no hook URL configured)'));
    this.log('Email', `would send report to ${p.contact.email || '(none)'} and alert ${this.brand().email}`);
  }
  brand() { const b = this.state.brands[this.state.brandId] || this.DEFAULT_BRANDS.inovo; return b; }
  // ---- handlers ----
  setView(view) { this.setState({ view }); try { window.scrollTo(0, 0); } catch (e) {} }
  startAssessment() { this.track('assessment_started', { brand: this.state.brandId }); this.setState({ view: 'assess', stage: 'intro', showValidation: false }); try { window.scrollTo(0, 0); } catch (e) {} }
  beginQuestions() { const a = this.state.answers; let i = 0; while (i < this.QUESTIONS.length && a[i] != null) i++; this.setState({ stage: 'questions', qIndex: Math.min(i, this.QUESTIONS.length - 1), showValidation: false }); }
  selectOption(idx) { const answers = { ...this.state.answers, [this.state.qIndex]: idx }; this.save('answers', answers); this.track('question_answered', { q: this.state.qIndex + 1, option: idx }); this.setState({ answers, showValidation: false }); }
  nextQuestion() {
    const { qIndex, answers } = this.state;
    if (answers[qIndex] == null) { this.setState({ showValidation: true }); return; }
    if (qIndex + 1 >= this.QUESTIONS.length) { this.track('score_previewed', { score: this.compute(answers).score }); this.setState({ stage: 'preview' }); try { window.scrollTo(0, 0); } catch (e) {} return; }
    this.setState({ qIndex: qIndex + 1, showValidation: false });
  }
  prevQuestion() { if (this.state.qIndex > 0) this.setState({ qIndex: this.state.qIndex - 1, showValidation: false }); }
  validateLead(l) {
    const e = {}; const personal = /@(gmail|yahoo|hotmail|outlook|live|aol|icloud|proton|protonmail)\./i;
    if (!l.name.trim()) e.name = 'Required';
    if (!l.company.trim()) e.company = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email)) e.email = 'Enter a valid email'; else if (personal.test(l.email)) e.email = 'Please use your work email';
    if (!l.role) e.role = 'Required';
    if (!l.seats) e.seats = 'Required';
    if ((l.phone.replace(/\D/g, '').length) < 10) e.phone = 'Enter a phone number with area code';
    return e;
  }
  submitLead() {
    const leadErr = this.validateLead(this.state.lead);
    if (Object.keys(leadErr).length) { this.setState({ leadErr }); return; }
    const payload = this.buildPayload(this.state.lead, this.state.answers, this.brand(), 'assessment_lead');
    const rec = { id: 'L' + Date.now(), payload };
    const leads = [rec, ...this.state.leads]; this.save('leads', leads);
    this.track('lead_captured', { score: payload.assessment.score, level: payload.assessment.level.n });
    this.setState({ leads, leadErr: {}, stage: 'report', selectedLeadId: rec.id }, () => this.fireStubs(payload));
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  submitPartner() {
    const f = this.state.pf; const pfErr = {};
    if (!f.name.trim()) pfErr.name = 'Required'; if (!f.company.trim()) pfErr.company = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) pfErr.email = 'Enter a valid work email';
    if (Object.keys(pfErr).length) { this.setState({ pfErr }); return; }
    const payload = { type: 'partner_inquiry', submittedAt: new Date().toISOString(), brand: { id: this.state.brandId, name: this.brand().name }, contact: { name: f.name, email: f.email, company: f.company, role: null, seatCount: null, phone: null }, partner: { clientsUnderManagement: f.clients, interest: f.interest, industries: f.industries, proposedEconomics: this.state.econ }, assessment: null, integrations: { hubspot: { status: 'stubbed', lifecyclestage: 'partner_lead' }, zapier: { status: 'stubbed' } } };
    const rec = { id: 'P' + Date.now(), payload }; const leads = [rec, ...this.state.leads]; this.save('leads', leads);
    this.track('partner_inquiry', { company: f.company });
    this.setState({ leads, pfErr: {}, partnerSent: true, selectedLeadId: rec.id }, () => this.fireStubs(payload));
  }
  retake() { this.save('answers', {}); this.setState({ answers: {}, qIndex: 0, stage: 'intro', lead: { name: '', email: '', company: '', role: '', seats: '', phone: '' }, leadErr: {} }); try { window.scrollTo(0, 0); } catch (e) {} }
  resetAll() { ['answers', 'leads', 'scoring', 'brands', 'econ', 'cfg'].forEach(k => { try { localStorage.removeItem(this.LS + k); } catch (e) {} }); this.setState({ view: 'landing', brandId: 'inovo', stage: 'intro', qIndex: 0, answers: {}, leads: [], selectedLeadId: null, integrationLog: [], scoring: this.DEFAULT_SCORING, brands: this.DEFAULT_BRANDS, econ: this.DEFAULT_ECON, cfg: { hubspotPortal: '', zapierHook: '' }, partnerSent: false, pf: { name: '', company: '', email: '', clients: '', interest: '', industries: '' }, lead: { name: '', email: '', company: '', role: '', seats: '', phone: '' }, leadErr: {}, pfErr: {} }); }
  seedDemoLead() {
    const answers = {}; this.QUESTIONS.forEach((q, i) => { answers[i] = [1, 2, 3, 2, 1, 3, 2, 0][i % 8]; });
    const lead = { name: 'Dana Whitfield', email: 'dana@northbridge-it.com', company: 'Northbridge IT Partners', role: 'Owner / CEO', seats: '1,500–5,000', phone: '(555) 201-4477' };
    const payload = this.buildPayload(lead, answers, this.state.brands.inovo, 'assessment_lead'); const rec = { id: 'L' + Date.now(), payload };
    const leads = [rec, ...this.state.leads]; this.save('leads', leads); this.setState({ leads, selectedLeadId: rec.id });
  }
  renderVals() {
    const S = this.state; const brandRaw = this.brand();
    const brand = { ...brandRaw, primaryDark: this.darken(brandRaw.primary), primarySoft: brandRaw.primary + '14', hasLogo: !!brandRaw.logo, noLogo: !brandRaw.logo, initials: (brandRaw.name || 'P').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase() };
    const active = '#3b82f6', idle = 'transparent';
    const viewBg = { landing: S.view === 'landing' ? active : idle, assess: S.view === 'assess' ? active : idle, admin: S.view === 'admin' ? active : idle, notes: S.view === 'notes' ? active : idle };
    const brandBg = { inovo: S.brandId === 'inovo' ? '#C5131B' : idle, partner: S.brandId === 'partner' ? (S.brands.partner.primary || '#0F4C81') : idle };
    const q = this.QUESTIONS[S.qIndex]; const domainName = this.DOMAINS.find(d => d.id === q.d).name;
    const sel = S.answers[S.qIndex];
    const options = q.options.map((o, i) => ({ label: o.label, selected: sel === i, select: () => this.selectOption(i), border: sel === i ? brand.primary : '#dcdce0', bg: sel === i ? brand.primary + '12' : '#fff', dotBorder: sel === i ? brand.primary : '#b5b5bb', dotBg: sel === i ? brand.primary : '#fff' }));
    const r = this.compute(S.answers);
    const statusMeta = { gap: ['Gap', '#b3121a'], watch: ['Watch', '#b7791f'], strong: ['Strong', '#1f7a3a'] };
    const domainScores = r.doms.map(d => ({ ...d, statusLabel: statusMeta[d.status][0], statusBg: statusMeta[d.status][1] }));
    const recs = r.recs.map((x, i) => ({ ...x, n: i + 1, statusLabel: statusMeta[x.status][0], statusBg: statusMeta[x.status][1] }));
    const sorted = [...r.doms].sort((a, b) => b.pct - a.pct);
    const lt = this.LEVEL_TEXT[r.level.n] || ['', ''];
    const levelScale = S.scoring.levels.map(l => ({ n: l.n, bg: l.n <= r.level.n ? brand.primary : '#e3e3e6', color: l.n === r.level.n ? brand.primary : '#999' }));
    const selected = S.leads.find(l => l.id === S.selectedLeadId) || S.leads[0] || null;
    const typeMeta = { assessment_lead: ['Assessment', '#1f7a3a'], partner_inquiry: ['Partner', '#0F4C81'] };
    const leadRows = S.leads.map(l => { const p = l.payload; const tm = typeMeta[p.type] || ['Lead', '#555']; return { id: l.id, name: p.contact.name, company: p.contact.company, typeLabel: tm[0], typeBg: tm[1], meta: p.assessment ? `Score ${p.assessment.score} · Level ${p.assessment.level.n} ${p.assessment.level.name} · ${p.contact.seatCount} seats · via ${p.brand.name}` : `${p.partner.interest || 'Interest not stated'} · ${p.partner.clientsUnderManagement || '?'} clients`, when: new Date(p.submittedAt).toLocaleString(), bg: selected && selected.id === l.id ? '#f0f4ff' : '#fff', select: () => this.setState({ selectedLeadId: l.id }) }; });
    const tabs = ['leads', 'integrations', 'scoring', 'config']; const tab = {}, tabBg = {}, tabColor = {}, adminIs = {};
    tabs.forEach(t => { tab[t] = () => this.setState({ adminTab: t }); tabBg[t] = S.adminTab === t ? '#fff' : 'transparent'; tabColor[t] = S.adminTab === t ? '#111' : '#555'; adminIs[t] = S.adminTab === t; });
    const answeredCount = Object.keys(S.answers).length;
    const onField = (key) => (e) => { const t = e.target; const v = t.type === 'checkbox' ? t.checked : t.value; this.setState(s => ({ [key]: { ...s[key], [t.name]: v }, [key + 'Err']: { ...(s[key + 'Err'] || {}), [t.name]: undefined } })); };
    const gapCount = r.doms.filter(d => d.status !== 'strong').length;
    return {
      brand, partnerName: S.brands.partner.name, is: { landing: S.view === 'landing', assess: S.view === 'assess', admin: S.view === 'admin', notes: S.view === 'notes' },
      go: { landing: (e) => { if (e && e.preventDefault && !(e.currentTarget && e.currentTarget.getAttribute('href') || '').startsWith('#p')) e.preventDefault(); this.setView('landing'); }, assess: () => this.setView('assess'), admin: () => this.setView('admin'), notes: () => this.setView('notes') },
      viewBg, brandBg, setBrand: { inovo: () => { this.setState({ brandId: 'inovo' }); }, partner: () => { this.setState({ brandId: 'partner' }); } }, resetAll: () => this.resetAll(),
      domainList: this.DOMAINS.map((d, i) => ({ ...d, n: i + 1 })),
      startAssessment: () => this.startAssessment(), beginQuestions: () => this.beginQuestions(), hasProgress: answeredCount > 0 && S.stage === 'intro', answeredCount,
      stage: { intro: S.stage === 'intro', questions: S.stage === 'questions', preview: S.stage === 'preview', gate: S.stage === 'gate', report: S.stage === 'report' },
      q: { text: q.text, help: q.help, domainName }, qNum: S.qIndex + 1, qTotal: this.QUESTIONS.length, progressPct: Math.round(S.qIndex / this.QUESTIONS.length * 100), options, showValidation: S.showValidation,
      isFirst: S.qIndex === 0, backOpacity: S.qIndex === 0 ? .4 : 1, nextLabel: S.qIndex + 1 >= this.QUESTIONS.length ? 'See my score' : 'Next →',
      prevQuestion: () => this.prevQuestion(), nextQuestion: () => this.nextQuestion(),
      score: r.score, level: { n: r.level.n, name: r.level.name, summary: lt[0], detail: lt[1] }, ring: { dash: `${(r.score / 100 * 326.7).toFixed(1)} 326.7` }, domainScores, recs, levelScale,
      bestDomain: sorted[0].name, worstDomain: sorted[sorted.length - 1].name, gapCount: gapCount || 'no',
      toGate: () => { this.setState({ stage: 'gate' }); try { window.scrollTo(0, 0); } catch (e) {} }, backToQuestions: () => this.setState({ stage: 'questions', qIndex: this.QUESTIONS.length - 1 }), backToPreview: () => this.setState({ stage: 'preview' }),
      lead: S.lead, leadErr: S.leadErr, leadBorder: Object.fromEntries(['name', 'email', 'company', 'role', 'seats', 'phone'].map(k => [k, S.leadErr[k] ? '#b3121a' : '#cfcfd3'])), onLeadChange: onField('lead'), submitLead: () => this.submitLead(),
      pf: S.pf, pfErr: S.pfErr, onPartnerChange: onField('pf'), submitPartner: () => this.submitPartner(), partnerSent: S.partnerSent, partnerNotSent: !S.partnerSent, partnerCtaUrl: S.brands.inovo.ctaPartnerUrl,
      retake: () => this.retake(), downloadStub: () => { this.log('PDF', 'would render branded PDF report server-side and download'); alert('Stub: in production this downloads a branded PDF of the report.'); },
      econ: S.econ, onEconChange: (e) => { const econ = { ...S.econ, [e.target.name]: Number(e.target.value) }; this.save('econ', econ); this.setState({ econ }); },
      leadCount: S.leads.length, noLeads: S.leads.length === 0, leadRows, selectedLabel: selected ? `${selected.payload.type} · ${selected.id}` : 'select a lead', noSelected: !selected, payloadJson: selected ? JSON.stringify(selected.payload, null, 2) : '// No lead selected.\n// Complete the assessment or seed a sample lead to see the structured payload.',
      pushHubspot: () => selected && this.fireStubs(selected.payload), pushZapier: () => selected && this.fireStubs(selected.payload), integrationLog: S.integrationLog, noLog: S.integrationLog.length === 0,
      tab, tabBg, tabColor, adminIs, cfg: { ...S.cfg, gapBelow: S.scoring.gapBelow, watchBelow: S.scoring.watchBelow },
      onCfgChange: (e) => { const { name, value } = e.target; if (name === 'gapBelow' || name === 'watchBelow') { const scoring = { ...S.scoring, [name]: Number(value) }; this.save('scoring', scoring); this.setState({ scoring }); } else { const cfg = { ...S.cfg, [name]: value }; this.save('cfg', cfg); this.setState({ cfg }); } },
      weightRows: this.DOMAINS.map(d => ({ id: d.id, name: d.name, weight: S.scoring.weights[d.id] })), onWeightChange: (e) => { const scoring = { ...S.scoring, weights: { ...S.scoring.weights, [e.target.name]: Number(e.target.value) } }; this.save('scoring', scoring); this.setState({ scoring }); },
      thresholdRows: S.scoring.levels.map(l => ({ ...l, locked: l.n === 1 })), onThresholdChange: (e) => { const scoring = { ...S.scoring, levels: S.scoring.levels.map(l => l.n === Number(e.target.name) ? { ...l, min: Number(e.target.value) } : l) }; this.save('scoring', scoring); this.setState({ scoring }); },
      resetScoring: () => { this.save('scoring', this.DEFAULT_SCORING); this.setState({ scoring: this.DEFAULT_SCORING }); },
      questionBank: this.QUESTIONS.map((qq, i) => ({ n: i + 1, text: qq.text, domainName: this.DOMAINS.find(d => d.id === qq.d).name, options: qq.options })),
      cfgBrands: S.brands, onBrandCfg: (e) => { const t = e.target; const [bid, key] = t.name.split('.'); const v = t.type === 'checkbox' ? t.checked : t.value; const brands = { ...S.brands, [bid]: { ...S.brands[bid], [key]: v } }; this.save('brands', brands); this.setState({ brands }); },
      resetBrands: () => { this.save('brands', this.DEFAULT_BRANDS); this.setState({ brands: this.DEFAULT_BRANDS }); },
      brandJson: JSON.stringify(brandRaw, null, 2),
      seedDemoLead: () => this.seedDemoLead()
    };
  }
}
