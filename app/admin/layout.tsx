import { currentSession } from '@/lib/auth';
import AdminChrome from '@/components/admin/AdminChrome';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = currentSession();
  return (
    <>
      {session ? <AdminChrome email={session.email} /> : null}
      {children}
    </>
  );
}
