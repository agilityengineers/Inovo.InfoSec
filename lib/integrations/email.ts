import 'server-only';

/**
 * Transactional email: the report (plus playbook, on the client assessment) to
 * the prospect, and an internal alert to everyone in `routing.notify`.
 *
 * The provider is Resend behind `RESEND_API_KEY`; swapping it for Postmark is a
 * change to `send()` alone.
 */

import { Resend } from 'resend';
import { withRetry } from '@/lib/integrations/retry';
import type { Brand, LeadPayload } from '@/lib/types';

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

function from(brand: Brand): string {
  return process.env.EMAIL_FROM || `${brand.name} <no-reply@inovois.com>`;
}

async function send(options: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  return withRetry(async () => {
    const { error } = await client().emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });
    if (error) throw new Error(error.message);
  });
}

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function reportHtml(payload: LeadPayload, brand: Brand): string {
  const a = payload.assessment;
  const heading = a?.level ? `Level ${a.level.n} · ${a.level.name}` : (a?.tier ?? '');
  const rows = (a?.domains ?? a?.functions ?? [])
    .map((d) => `<tr><td style="padding:4px 12px 4px 0">${esc(d.name)}</td><td><strong>${d.pct}%</strong></td></tr>`)
    .join('');
  const recs = (payload.recommendations ?? [])
    .map((r) => `<li><strong>${esc(r.title)}</strong><br><span style="color:#555">Maps to: ${esc(r.service)}</span></li>`)
    .join('');

  return `<div style="font-family:Figtree,'Century Gothic',system-ui,sans-serif;color:#111;max-width:640px">
    <p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${esc(brand.primary)}">Your assessment report</p>
    <h1 style="font-size:28px;font-weight:800;margin:0 0 8px">${esc(String(a?.score ?? ''))} out of 100</h1>
    <p style="font-size:17px;margin:0 0 20px;color:${esc(brand.primary)};font-weight:700">${esc(heading)}</p>
    <p>Prepared for ${esc(payload.contact.name)}, ${esc(payload.contact.company)}.</p>
    <table style="border-collapse:collapse;margin:16px 0">${rows}</table>
    <ol>${recs}</ol>
    <p><a href="${esc(brand.ctaDirectUrl)}" style="color:${esc(brand.primary)};font-weight:700">${esc(brand.reportCtaLabel)}</a></p>
    <hr style="border:0;border-top:1px solid #e8e8ea;margin:24px 0">
    <p style="font-size:12px;color:#777">${esc(brand.legalName)} · ${esc(brand.address)}${
      brand.poweredBy ? '<br>Security program delivered with Inovo Infosec' : ''
    }</p>
  </div>`;
}

export async function sendProspectReport(
  payload: LeadPayload,
  brand: Brand,
  attachments?: { filename: string; content: Buffer }[],
): Promise<void> {
  const subject = payload.playbook
    ? `Your readiness report and ${payload.playbook.title}`
    : 'Your MSP Security Posture Assessment report';
  await send({
    from: from(brand),
    to: [payload.contact.email],
    subject,
    html: reportHtml(payload, brand),
    attachments,
  });
}

export async function sendInternalAlert(payload: LeadPayload, brand: Brand): Promise<void> {
  const notify = payload.routing?.notify ?? brand.routing.notify;
  if (!notify?.length) return;
  const qual = payload.qualification ? `[${payload.qualification.tier}] ` : '';
  await send({
    from: from(brand),
    to: notify,
    subject: `${qual}${payload.type} — ${payload.contact.company || payload.contact.email}`,
    html: `<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;white-space:pre-wrap">${esc(
      JSON.stringify(payload, null, 2),
    )}</pre>`,
  });
}
