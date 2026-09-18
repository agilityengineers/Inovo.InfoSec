import { requireAdmin } from '@/lib/auth';
import MspNotes from '@/components/generated/MspNotes';

export const dynamic = 'force-dynamic';

/**
 * `/admin/notes` — the prototype's Build notes page, content unchanged, kept as
 * an internal document behind admin auth rather than a public route.
 */
export default function Page() {
  requireAdmin();
  return <MspNotes />;
}
