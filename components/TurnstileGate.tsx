'use client';

import { useEffect, useRef } from 'react';
import { setTurnstileToken, turnstileSiteKey } from '@/lib/turnstile-client';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Mounts an invisible Turnstile widget beside the ported screens, so the
 * approved layout is untouched. Renders nothing at all when no site key is set.
 */
export default function TurnstileGate() {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !container.current) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !container.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: turnstileSiteKey,
        appearance: 'interaction-only',
        callback: (value: string) => setTurnstileToken(value),
        'error-callback': () => setTurnstileToken(null),
        'expired-callback': () => setTurnstileToken(null),
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.querySelector(`script[src="${SCRIPT}"]`)) {
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      document.querySelector(`script[src="${SCRIPT}"]`)?.addEventListener('load', render);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  if (!turnstileSiteKey) return null;
  return <div ref={container} aria-hidden="true" style={{ display: 'none' }} />;
}
