import { describe, expect, it } from 'vitest';
import {
  validateMspLead,
  validatePartner,
  validateClientLead,
  leadSubmission,
  isWorkEmail,
} from '@/lib/validation';
import type { ClientLeadForm, MspLeadForm, PartnerForm } from '@/lib/types';

const validMsp: MspLeadForm = {
  name: 'Dana Whitfield',
  company: 'Northbridge IT Partners',
  email: 'dana@northbridge-it.com',
  role: 'Owner / CEO',
  seats: '1,500–5,000',
  phone: '(555) 201-4477',
};

const validClient: ClientLeadForm = {
  name: 'Marcus Ellery',
  company: 'Harborline Aerospace',
  email: 'mellery@harborline-aero.com',
  role: 'CIO',
  phone: '(555) 322-8810',
  employees: '200–499',
  provider: 'Our MSP / IT provider',
  frameworks: [],
  deadline: '',
  timeline: 'Within 90 days',
  budget: 'I own the budget',
  sensitive: 'Yes',
};

describe('form validation', () => {
  it('accepts a complete lead', () => {
    expect(validateMspLead(validMsp)).toEqual({});
    expect(validateClientLead(validClient)).toEqual({});
  });

  it('rejects every personal email domain named in the spec', () => {
    for (const domain of [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'live.com',
      'aol.com',
      'icloud.com',
      'proton.me',
      'protonmail.com',
    ]) {
      const email = `someone@${domain}`;
      expect(isWorkEmail(email), domain).toBe(false);
      expect(validateMspLead({ ...validMsp, email }).email).toBe('Please use your work email');
      expect(validateClientLead({ ...validClient, email }).email).toBe('Please use your work email');
    }
  });

  it('distinguishes a malformed address from a personal one', () => {
    expect(validateMspLead({ ...validMsp, email: 'not-an-email' }).email).toBe('Enter a valid email');
    expect(validateMspLead({ ...validMsp, email: 'a@b' }).email).toBe('Enter a valid email');
  });

  it('does not reject a work domain that merely contains a personal name', () => {
    for (const email of ['dana@gmailservices.com', 'ops@liveoak-it.com', 'bd@protonics.io']) {
      expect(isWorkEmail(email), email).toBe(true);
    }
  });

  it('requires at least ten phone digits, ignoring formatting', () => {
    expect(validateMspLead({ ...validMsp, phone: '555-1234' }).phone).toBe(
      'Enter a phone number with area code',
    );
    expect(validateMspLead({ ...validMsp, phone: '+1 (555) 201-4477' }).phone).toBeUndefined();
  });

  it('marks every required field on the client gate', () => {
    const errors = validateClientLead({
      ...validClient,
      name: '  ',
      company: '',
      role: '',
      employees: '',
      provider: '',
      timeline: '',
      budget: '',
      sensitive: '',
    });
    for (const field of ['name', 'company', 'role', 'employees', 'provider', 'timeline', 'budget', 'sensitive']) {
      expect(errors[field as keyof ClientLeadForm], field).toBe('Required');
    }
    // Frameworks and deadline are the two optional fields.
    expect(errors.frameworks).toBeUndefined();
    expect(errors.deadline).toBeUndefined();
  });

  it('uses the partner form’s own email message', () => {
    const errors = validatePartner({ name: '', company: '', email: 'nope' } as PartnerForm);
    expect(errors).toEqual({ name: 'Required', company: 'Required', email: 'Enter a valid work email' });
  });

  it('re-checks everything server-side, and rejects a filled honeypot', () => {
    const body = {
      type: 'assessment_lead' as const,
      brandSlug: 'inovo',
      answers: { 0: 1, 1: 2 },
      lead: validMsp,
    };
    expect(leadSubmission.safeParse(body).success).toBe(true);
    expect(leadSubmission.safeParse({ ...body, website: 'http://spam' }).success).toBe(false);
    expect(
      leadSubmission.safeParse({ ...body, lead: { ...validMsp, email: 'x@gmail.com' } }).success,
    ).toBe(false);
    expect(leadSubmission.safeParse({ ...body, answers: { 0: 9 } }).success).toBe(false);
  });
});
