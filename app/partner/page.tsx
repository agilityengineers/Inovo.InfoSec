import { redirect } from 'next/navigation';

/** `/partner` is an anchor on the landing page, not a page of its own. */
export default function Page() {
  redirect('/#partner');
}
