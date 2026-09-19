'use client';

import { useEffect, useRef } from 'react';

/**
 * Moves focus to the question heading when the step changes, so a keyboard or
 * screen-reader user lands on the new question instead of staying on the Next
 * button they just pressed.
 *
 * It is applied here rather than in the markup because the screens under
 * `components/generated/` are a verbatim transliteration of the approved
 * prototype and are regenerated from it.
 */
export function useFocusOnStep(step: number, screenLabel: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>(`[data-screen-label="${screenLabel}"] h2`);
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }, [step, screenLabel]);
}
