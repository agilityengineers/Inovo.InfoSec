/**
 * Form validation. The error strings and the order in which they are produced
 * are reproduced exactly from `validateLead()` / `validate()` / `submitPartner()`
 * in the reference logic files — they are visible copy.
 *
 * The same rules run twice: the plain validators drive the inline errors in the
 * forms, and the zod schemas re-check everything server-side at `/api/leads`,
 * since a client-side check is a convenience, not a guarantee.
 */

import { z } from 'zod';
import type { ClientLeadForm, MspLeadForm, PartnerForm } from '@/lib/types';

/** Personal-domain rule from the reference; work email is required on every gate. */
export const PERSONAL_EMAIL = /@(gmail|yahoo|hotmail|outlook|live|aol|icloud|proton|protonmail)\./i;
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isWorkEmail = (email: string) => EMAIL_SHAPE.test(email) && !PERSONAL_EMAIL.test(email);
export const digits = (s: string) => (s || '').replace(/\D/g, '').length;

export type Errors<T> = Partial<Record<keyof T, string>>;

export function validateMspLead(l: MspLeadForm): Errors<MspLeadForm> {
  const e: Errors<MspLeadForm> = {};
  if (!l.name.trim()) e.name = 'Required';
  if (!l.company.trim()) e.company = 'Required';
  if (!EMAIL_SHAPE.test(l.email)) e.email = 'Enter a valid email';
  else if (PERSONAL_EMAIL.test(l.email)) e.email = 'Please use your work email';
  if (!l.role) e.role = 'Required';
  if (!l.seats) e.seats = 'Required';
  if (digits(l.phone) < 10) e.phone = 'Enter a phone number with area code';
  return e;
}

export function validatePartner(f: PartnerForm): Errors<PartnerForm> {
  const e: Errors<PartnerForm> = {};
  if (!f.name.trim()) e.name = 'Required';
  if (!f.company.trim()) e.company = 'Required';
  if (!EMAIL_SHAPE.test(f.email)) e.email = 'Enter a valid work email';
  return e;
}

export function validateClientLead(l: ClientLeadForm): Errors<ClientLeadForm> {
  const e: Errors<ClientLeadForm> = {};
  if (!l.name.trim()) e.name = 'Required';
  if (!l.company.trim()) e.company = 'Required';
  if (!EMAIL_SHAPE.test(l.email)) e.email = 'Enter a valid email';
  else if (PERSONAL_EMAIL.test(l.email)) e.email = 'Please use your work email';
  (['role', 'employees', 'provider', 'timeline', 'budget', 'sensitive'] as const).forEach((k) => {
    if (!l[k]) e[k] = 'Required';
  });
  if (digits(l.phone) < 10) e.phone = 'Enter a phone number with area code';
  return e;
}

// ------------------------------------------------------------ server schemas

const workEmail = z
  .string()
  .regex(EMAIL_SHAPE, 'Enter a valid email')
  .refine((v) => !PERSONAL_EMAIL.test(v), 'Please use your work email');

const phone = z.string().refine((v) => digits(v) >= 10, 'Enter a phone number with area code');

const answersSchema = z.record(z.string(), z.number().int().min(0).max(3));

const sourceSchema = z
  .object({
    host: z.string().optional(),
    utm: z.record(z.string(), z.string()).nullable().optional(),
  })
  .optional();

/** Honeypot: a real visitor never fills this; a bot fills everything. */
const honeypot = z.string().max(0, 'rejected').optional();

export const mspLeadSubmission = z.object({
  type: z.literal('assessment_lead'),
  brandSlug: z.string().min(1),
  answers: answersSchema,
  source: sourceSchema,
  turnstileToken: z.string().optional(),
  website: honeypot,
  lead: z.object({
    name: z.string().trim().min(1, 'Required'),
    company: z.string().trim().min(1, 'Required'),
    email: workEmail,
    role: z.string().min(1, 'Required'),
    seats: z.string().min(1, 'Required'),
    phone,
  }),
});

export const partnerSubmission = z.object({
  type: z.literal('partner_inquiry'),
  brandSlug: z.string().min(1),
  source: sourceSchema,
  turnstileToken: z.string().optional(),
  website: honeypot,
  form: z.object({
    name: z.string().trim().min(1, 'Required'),
    company: z.string().trim().min(1, 'Required'),
    email: z.string().regex(EMAIL_SHAPE, 'Enter a valid work email'),
    clients: z.string().default(''),
    interest: z.string().default(''),
    industries: z.string().default(''),
  }),
});

export const clientLeadSubmission = z.object({
  type: z.literal('client_assessment_lead'),
  brandSlug: z.string().min(1),
  answers: answersSchema,
  source: sourceSchema,
  turnstileToken: z.string().optional(),
  website: honeypot,
  lead: z.object({
    name: z.string().trim().min(1, 'Required'),
    company: z.string().trim().min(1, 'Required'),
    email: workEmail,
    role: z.string().min(1, 'Required'),
    phone,
    employees: z.string().min(1, 'Required'),
    provider: z.string().min(1, 'Required'),
    frameworks: z.array(z.string()).default([]),
    deadline: z.string().default(''),
    timeline: z.string().min(1, 'Required'),
    budget: z.string().min(1, 'Required'),
    sensitive: z.string().min(1, 'Required'),
  }),
});

export const leadSubmission = z.discriminatedUnion('type', [
  mspLeadSubmission,
  partnerSubmission,
  clientLeadSubmission,
]);

export type LeadSubmission = z.infer<typeof leadSubmission>;
