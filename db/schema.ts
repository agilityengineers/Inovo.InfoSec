/**
 * Drizzle schema. Runs on Replit's built-in Postgres (Neon) via `DATABASE_URL`.
 *
 * The lead payload is stored whole as JSONB — it is the contract the
 * integrations fan out — with the fields the admin filters and sorts on lifted
 * into indexed columns beside it.
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import type {
  Econ,
  LeadPayload,
  Routing,
  Scoring,
  Qualification,
  Vertical as VerticalType,
} from '@/lib/types';

/** One tenant. Resolved per request by hostname, else by `/p/[slug]`. */
export const brands = pgTable(
  'brands',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    slug: varchar('slug', { length: 128 }).notNull(),
    name: text('name').notNull(),
    legalName: text('legal_name').notNull(),
    tagline: text('tagline').notNull(),
    logo: text('logo'),
    primary: varchar('primary', { length: 9 }).notNull(),
    phone: text('phone').notNull(),
    incidentPhone: text('incident_phone').notNull(),
    email: text('email').notNull(),
    address: text('address').notNull(),
    ctaDirectLabel: text('cta_direct_label').notNull(),
    ctaDirectUrl: text('cta_direct_url').notNull(),
    ctaPartnerUrl: text('cta_partner_url'),
    reportCtaLabel: text('report_cta_label').notNull(),
    poweredBy: boolean('powered_by').notNull().default(false),
    showPartnerCta: boolean('show_partner_cta').notNull().default(false),
    /** Client assessment: a single vertical per brand. */
    vertical: varchar('vertical', { length: 64 }),
    hostnames: jsonb('hostnames').$type<string[]>().notNull().default([]),
    routing: jsonb('routing').$type<Routing>().notNull(),
    econ: jsonb('econ').$type<Econ>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('brands_slug_idx').on(t.slug),
  }),
);

/**
 * Versioned scoring configuration. The admin edits weights, level thresholds
 * and the gap/watch cutoffs; each save writes a new version and flips `active`
 * so a lead can always be re-scored against the config it was scored with.
 */
export const assessments = pgTable(
  'assessments',
  {
    id: serial('id').primaryKey(),
    key: varchar('key', { length: 64 }).notNull(),
    version: integer('version').notNull().default(1),
    active: boolean('active').notNull().default(true),
    config: jsonb('config').$type<Scoring | Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    keyVersionIdx: uniqueIndex('assessments_key_version_idx').on(t.key, t.version),
    activeIdx: index('assessments_active_idx').on(t.key, t.active),
  }),
);

/** The seven client-assessment verticals; `{FW} {DATA} {AUD} {SYSTEMS}` sources. */
export const verticals = pgTable('verticals', {
  id: varchar('id', { length: 64 }).primaryKey(),
  label: text('label').notNull(),
  config: jsonb('config').$type<VerticalType>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** The admin-editable HOT/WARM/NURTURE rule, stored as a single row per key. */
export const qualificationRules = pgTable('qualification_rules', {
  key: varchar('key', { length: 64 }).primaryKey(),
  rule: jsonb('rule').$type<Qualification>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Integration endpoints and keys that the admin sets rather than the env. */
export const settings = pgTable('settings', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: jsonb('value').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable(
  'leads',
  {
    id: varchar('id', { length: 40 }).primaryKey(),
    type: varchar('type', { length: 40 }).notNull(),
    brandId: varchar('brand_id', { length: 64 }).notNull(),
    email: text('email'),
    company: text('company'),
    name: text('name'),
    score: integer('score'),
    /** Maturity level name (MSP) or readiness tier name (client). */
    tier: varchar('tier', { length: 40 }),
    qualification: varchar('qualification', { length: 16 }),
    verticalId: varchar('vertical_id', { length: 64 }),
    payload: jsonb('payload').$type<LeadPayload>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index('leads_created_idx').on(t.createdAt),
    brandIdx: index('leads_brand_idx').on(t.brandId),
    typeIdx: index('leads_type_idx').on(t.type),
    emailIdx: index('leads_email_idx').on(t.email),
    qualIdx: index('leads_qualification_idx').on(t.qualification),
    scoreIdx: index('leads_score_idx').on(t.score),
  }),
);

/** One row per fan-out attempt, surfaced as the admin's integration log. */
export const integrationEvents = pgTable(
  'integration_events',
  {
    id: serial('id').primaryKey(),
    leadId: varchar('lead_id', { length: 40 }),
    target: varchar('target', { length: 40 }).notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    attempt: integer('attempt').notNull().default(1),
    message: text('message').notNull(),
    detail: jsonb('detail').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    leadIdx: index('integration_events_lead_idx').on(t.leadId),
    createdIdx: index('integration_events_created_idx').on(t.createdAt),
  }),
);

export type BrandRow = typeof brands.$inferSelect;
export type LeadRow = typeof leads.$inferSelect;
export type IntegrationEventRow = typeof integrationEvents.$inferSelect;
