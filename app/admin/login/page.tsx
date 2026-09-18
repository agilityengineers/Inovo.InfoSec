import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { checkCredentials, currentSession, newSession, sessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Single-admin sign-in. Swappable for a NextAuth magic link; see `lib/auth.ts`. */
export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (currentSession()) redirect('/admin');

  async function signIn(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    if (!checkCredentials(email, password)) {
      redirect('/admin/login?error=1');
    }
    cookies().set(sessionCookie(newSession(email)));
    redirect('/admin');
  }

  const field: React.CSSProperties = {
    padding: '11px 12px',
    borderRadius: 6,
    border: '1px solid #cfcfd3',
    fontSize: 15,
    minHeight: 44,
    width: '100%',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f3f5', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form
        action={signIn}
        style={{
          background: '#fff',
          border: '1px solid #e6e6e9',
          borderRadius: 14,
          padding: 32,
          width: '100%',
          maxWidth: 380,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em' }}>Admin sign in</div>
        <p style={{ margin: '0 0 6px', color: '#666', fontSize: 14 }}>
          Leads, payloads and configuration for both assessments.
        </p>
        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600, color: '#333' }}>
          Email
          <input name="email" type="email" autoComplete="username" required style={field} />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 600, color: '#333' }}>
          Password
          <input name="password" type="password" autoComplete="current-password" required style={field} />
        </label>
        {searchParams.error ? (
          <div style={{ color: '#b3121a', fontSize: 13, fontWeight: 600 }}>
            That email and password did not match.
          </div>
        ) : null}
        <button
          type="submit"
          style={{
            background: '#111',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            padding: '15px 24px',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            minHeight: 48,
          }}
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
