'use client';

/**
 * Admin chrome.
 *
 * The prototype's dark "PROTOTYPE" bar does not ship. Its useful functions —
 * switching view, switching brand, switching vertical and resetting the demo —
 * move here, where they are behind authentication, plus a dev-only brand
 * preview that is not rendered in production.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const link: React.CSSProperties = {
  color: '#c9cbd1',
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 600,
  padding: '5px 10px',
  borderRadius: 4,
};

export default function AdminChrome({ email }: { email: string }) {
  const active = usePathname();
  const tab = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      style={{ ...link, background: active === href ? '#3b82f6' : 'transparent', color: '#fff' }}
    >
      {label}
    </Link>
  );

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#15161a',
        color: '#c9cbd1',
        fontSize: 12,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid #2a2c33',
      }}
    >
      <span
        style={{
          fontWeight: 800,
          letterSpacing: '.12em',
          fontSize: 10,
          color: '#ffd166',
          border: '1px solid #ffd166',
          borderRadius: 3,
          padding: '2px 6px',
        }}
      >
        ADMIN
      </span>
      <div style={{ display: 'flex', gap: 2, background: '#25272e', borderRadius: 6, padding: 2 }}>
        {tab('/admin', 'MSP assessment')}
        {tab('/admin/client', 'Client assessment')}
        {tab('/admin/notes', 'Build notes')}
      </div>
      {process.env.NODE_ENV !== 'production' ? (
        <div style={{ display: 'flex', gap: 2, background: '#25272e', borderRadius: 6, padding: 2 }}>
          <span style={{ ...link, opacity: 0.6 }}>Preview:</span>
          <Link href="/" style={{ ...link, color: '#fff' }}>
            Inovo
          </Link>
          <Link href="/p/msp-security-services" style={{ ...link, color: '#fff' }}>
            Partner
          </Link>
        </div>
      ) : null}
      <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{email}</span>
      <form action="/api/admin/signout" method="post">
        <button
          type="submit"
          style={{
            border: '1px solid #3a3d46',
            background: 'transparent',
            color: '#c9cbd1',
            borderRadius: 4,
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 12,
            minHeight: 28,
          }}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
