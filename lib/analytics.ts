/**
 * Analytics events named in the spec. Kept as one funnel so the event names
 * stay greppable; swap the sink for a real provider without touching callers.
 */

export type AnalyticsEvent =
  | 'assessment_started'
  | 'question_answered'
  | 'score_previewed'
  | 'lead_captured'
  | 'partner_inquiry'
  | 'client_assessment_started'
  | 'client_lead_captured';

type Payload = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Payload[];
  }
}

export function track(event: AnalyticsEvent, data: Payload = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, data);
  }
}

/** UTM parameters are captured at first touch and ride along in the payload. */
export function captureUtm(search: string): Record<string, string> | null {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}
