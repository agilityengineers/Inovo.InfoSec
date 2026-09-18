import 'server-only';

/**
 * Cloudflare Turnstile. Env-gated: with no `TURNSTILE_SECRET_KEY` set the check
 * is skipped, so the funnel works before anyone has provisioned a key. The
 * honeypot field in the zod schemas runs either way.
 */

export async function verifyTurnstile(
  token: string | undefined,
  request: Request,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: 'not configured' };
  if (!token) return { ok: false, reason: 'missing token' };

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
  if (ip) form.append('remoteip', ip.split(',')[0].trim());

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return data.success ? { ok: true } : { ok: false, reason: (data['error-codes'] || []).join(',') };
  } catch (error) {
    // A Turnstile outage must not swallow real leads.
    // eslint-disable-next-line no-console
    console.error('[turnstile] verification unavailable, allowing submission', error);
    return { ok: true, reason: 'verification unavailable' };
  }
}
