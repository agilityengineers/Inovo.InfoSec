import 'server-only';

/**
 * Data access for brands, config and leads.
 *
 * Every read falls back to the seed data in `lib/data/`, so the site renders
 * correctly before anyone has run `npm run db:push` — the seeds and the
 * database hold the same shapes. Writes need a database; without one they go to
 * a process-local store that is explicitly development-only, so a first-run
 * Replit import can click through the whole funnel before Postgres is attached.
 */

import { and, desc, eq } from 'drizzle-orm';
import { db, hasDatabase, schema } from '@/db';
import { SEED_BRANDS } from '@/lib/data/brands';
import { DEFAULT_SCORING } from '@/lib/data/msp';
import { VERTICALS, DEFAULT_QUAL } from '@/lib/data/client';
import type { Brand, LeadPayload, Qualification, Scoring, Vertical } from '@/lib/types';

/**
 * Reads fall back to the seed data if the database is unreachable.
 *
 * The public funnel is a lead magnet: rendering it from seeds during a database
 * blip is far better than a 500, and every string it needs is compiled in.
 * Writes deliberately do not fall back — a lead we cannot persist must surface.
 */
async function readOrSeed<T>(what: string, read: () => Promise<T>, seed: () => T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[repo] ${what} read failed, serving seed data:`, error);
    return seed();
  }
}

const memory = {
  leads: [] as (typeof schema.leads.$inferSelect)[],
  events: [] as (typeof schema.integrationEvents.$inferSelect)[],
  brands: null as Record<string, Brand> | null,
  scoring: null as Scoring | null,
  qual: null as Qualification | null,
  settings: {} as Record<string, Record<string, unknown>>,
  warned: false,
};

function warnMemoryOnly(action: string) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`DATABASE_URL is required in production (attempted: ${action})`);
  }
  if (!memory.warned) {
    memory.warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[repo] DATABASE_URL is not set — using an in-memory store. Data is lost on restart.\n' +
        '       Set DATABASE_URL and run `npm run db:push && npm run db:seed` to persist.',
    );
  }
}

/**
 * Probes the database directly, with no seed fallback.
 *
 * The reads above deliberately hide an outage so the funnel keeps rendering —
 * which would make a health check built on them report "ok" while Postgres is
 * down. This is the one path that tells the truth.
 */
export async function pingDatabase(): Promise<{ ok: boolean; brands?: number; error?: string }> {
  if (!hasDatabase()) return { ok: false, error: 'DATABASE_URL is not set' };
  try {
    const rows = await db().select({ id: schema.brands.id }).from(schema.brands);
    return { ok: true, brands: rows.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ------------------------------------------------------------------ brands

function seedBrandList(): Brand[] {
  return Object.values(memory.brands ?? SEED_BRANDS);
}

export async function listBrands(): Promise<Brand[]> {
  if (!hasDatabase()) return seedBrandList();
  return readOrSeed(
    'brands',
    async () => {
      const rows = await db().select().from(schema.brands);
      return rows.length ? rows.map(rowToBrand) : seedBrandList();
    },
    seedBrandList,
  );
}

function rowToBrand(row: typeof schema.brands.$inferSelect): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    legalName: row.legalName,
    tagline: row.tagline,
    logo: row.logo,
    primary: row.primary,
    phone: row.phone,
    incidentPhone: row.incidentPhone,
    email: row.email,
    address: row.address,
    ctaDirectLabel: row.ctaDirectLabel,
    ctaDirectUrl: row.ctaDirectUrl,
    ctaPartnerUrl: row.ctaPartnerUrl ?? undefined,
    reportCtaLabel: row.reportCtaLabel,
    poweredBy: row.poweredBy,
    showPartnerCta: row.showPartnerCta,
    vertical: row.vertical ?? undefined,
    hostnames: row.hostnames ?? [],
    routing: row.routing,
    econ: row.econ,
  };
}

/** The default tenant when nothing matches the hostname or path. */
export async function defaultBrand(): Promise<Brand> {
  const all = await listBrands();
  return all.find((b) => b.id === 'inovo') ?? all[0];
}

export async function brandBySlug(slug: string): Promise<Brand | null> {
  const all = await listBrands();
  return all.find((b) => b.slug === slug) ?? null;
}

/**
 * Resolves the tenant for a request: hostname first (`security.partner.com`),
 * then the `/p/[slug]` prefix, then the default brand.
 */
export async function resolveBrand(host: string | null, slug?: string): Promise<Brand> {
  const all = await listBrands();
  if (slug) {
    const bySlug = all.find((b) => b.slug === slug);
    if (bySlug) return bySlug;
  }
  if (host) {
    const hostname = host.split(':')[0].toLowerCase();
    const byHost = all.find((b) => b.hostnames.some((h) => h.toLowerCase() === hostname));
    if (byHost) return byHost;
  }
  return all.find((b) => b.id === 'inovo') ?? all[0];
}

export async function saveBrand(brand: Brand): Promise<void> {
  if (!hasDatabase()) {
    warnMemoryOnly('saveBrand');
    memory.brands = { ...(memory.brands ?? SEED_BRANDS), [brand.id]: brand };
    return;
  }
  await db()
    .insert(schema.brands)
    .values({ ...brand, ctaPartnerUrl: brand.ctaPartnerUrl ?? null, showPartnerCta: brand.showPartnerCta ?? false })
    .onConflictDoUpdate({
      target: schema.brands.id,
      set: {
        ...brand,
        ctaPartnerUrl: brand.ctaPartnerUrl ?? null,
        showPartnerCta: brand.showPartnerCta ?? false,
        updatedAt: new Date(),
      },
    });
}

// ----------------------------------------------------------------- scoring

/** The active MSP scoring config; falls back to what the prototype shipped. */
export async function activeScoring(): Promise<Scoring> {
  if (!hasDatabase()) return memory.scoring ?? DEFAULT_SCORING;
  return readOrSeed(
    'scoring',
    async () => {
      const [row] = await db()
        .select()
        .from(schema.assessments)
        .where(and(eq(schema.assessments.key, 'msp-v1'), eq(schema.assessments.active, true)))
        .orderBy(desc(schema.assessments.version))
        .limit(1);
      return (row?.config as Scoring) ?? DEFAULT_SCORING;
    },
    () => DEFAULT_SCORING,
  );
}

/** Saving scoring writes a new version rather than mutating the current one. */
export async function saveScoring(config: Scoring): Promise<void> {
  if (!hasDatabase()) {
    warnMemoryOnly('saveScoring');
    memory.scoring = config;
    return;
  }
  const rows = await db()
    .select({ version: schema.assessments.version })
    .from(schema.assessments)
    .where(eq(schema.assessments.key, 'msp-v1'))
    .orderBy(desc(schema.assessments.version))
    .limit(1);
  const next = (rows[0]?.version ?? 0) + 1;
  await db()
    .update(schema.assessments)
    .set({ active: false })
    .where(eq(schema.assessments.key, 'msp-v1'));
  await db().insert(schema.assessments).values({ key: 'msp-v1', version: next, active: true, config });
}

export async function qualificationRule(): Promise<Qualification> {
  if (!hasDatabase()) return memory.qual ?? DEFAULT_QUAL;
  return readOrSeed(
    'qualification rule',
    async () => {
      const [row] = await db()
        .select()
        .from(schema.qualificationRules)
        .where(eq(schema.qualificationRules.key, 'client-v1'))
        .limit(1);
      return row?.rule ?? DEFAULT_QUAL;
    },
    () => DEFAULT_QUAL,
  );
}

export async function saveQualificationRule(rule: Qualification): Promise<void> {
  if (!hasDatabase()) {
    warnMemoryOnly('saveQualificationRule');
    memory.qual = rule;
    return;
  }
  await db()
    .insert(schema.qualificationRules)
    .values({ key: 'client-v1', rule })
    .onConflictDoUpdate({
      target: schema.qualificationRules.key,
      set: { rule, updatedAt: new Date() },
    });
}

export async function listVerticals(): Promise<Vertical[]> {
  if (!hasDatabase()) return Object.values(VERTICALS);
  return readOrSeed(
    'verticals',
    async () => {
      const rows = await db().select().from(schema.verticals);
      return rows.length ? rows.map((r) => r.config) : Object.values(VERTICALS);
    },
    () => Object.values(VERTICALS),
  );
}

export async function getSetting<T extends Record<string, unknown>>(key: string, fallback: T): Promise<T> {
  if (!hasDatabase()) return (memory.settings[key] as T) ?? fallback;
  return readOrSeed(
    `setting ${key}`,
    async () => {
      const [row] = await db().select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
      return (row?.value as T) ?? fallback;
    },
    () => fallback,
  );
}

export async function saveSetting(key: string, value: Record<string, unknown>): Promise<void> {
  if (!hasDatabase()) {
    warnMemoryOnly('saveSetting');
    memory.settings[key] = value;
    return;
  }
  await db()
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

// ------------------------------------------------------------------- leads

export type StoredLead = typeof schema.leads.$inferSelect;

function leadId(payload: LeadPayload): string {
  const prefix =
    payload.type === 'partner_inquiry' ? 'P' : payload.type === 'client_assessment_lead' ? 'C' : 'L';
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function insertLead(payload: LeadPayload): Promise<StoredLead> {
  const row: StoredLead = {
    id: leadId(payload),
    type: payload.type,
    brandId: payload.brand.id,
    email: payload.contact.email || null,
    company: payload.contact.company || null,
    name: payload.contact.name || null,
    score: payload.assessment?.score ?? null,
    tier: payload.assessment?.tier ?? payload.assessment?.level?.name ?? null,
    qualification: payload.qualification?.tier ?? null,
    verticalId: payload.vertical?.id ?? null,
    payload,
    createdAt: new Date(payload.submittedAt),
  };

  if (!hasDatabase()) {
    warnMemoryOnly('insertLead');
    memory.leads.unshift(row);
    return row;
  }
  await db().insert(schema.leads).values(row);
  return row;
}

export async function listLeads(opts: { type?: string; limit?: number } = {}): Promise<StoredLead[]> {
  const limit = opts.limit ?? 100;
  if (!hasDatabase()) {
    const rows = opts.type ? memory.leads.filter((l) => l.type === opts.type) : memory.leads;
    return rows.slice(0, limit);
  }
  const base = db().select().from(schema.leads);
  const rows = opts.type
    ? await base.where(eq(schema.leads.type, opts.type)).orderBy(desc(schema.leads.createdAt)).limit(limit)
    : await base.orderBy(desc(schema.leads.createdAt)).limit(limit);
  return rows;
}

export async function getLead(id: string): Promise<StoredLead | null> {
  if (!hasDatabase()) return memory.leads.find((l) => l.id === id) ?? null;
  const [row] = await db().select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  return row ?? null;
}

// ------------------------------------------------------- integration events

export type StoredEvent = typeof schema.integrationEvents.$inferSelect;

export async function logIntegrationEvent(event: {
  leadId?: string | null;
  target: string;
  status: string;
  attempt?: number;
  message: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const row = {
    leadId: event.leadId ?? null,
    target: event.target,
    status: event.status,
    attempt: event.attempt ?? 1,
    message: event.message,
    detail: event.detail ?? null,
  };
  if (!hasDatabase()) {
    memory.events.unshift({ ...row, id: memory.events.length + 1, createdAt: new Date() });
    memory.events = memory.events.slice(0, 200);
    return;
  }
  await db().insert(schema.integrationEvents).values(row);
}

export async function listIntegrationEvents(limit = 30): Promise<StoredEvent[]> {
  if (!hasDatabase()) return memory.events.slice(0, limit);
  return db()
    .select()
    .from(schema.integrationEvents)
    .orderBy(desc(schema.integrationEvents.createdAt))
    .limit(limit);
}
