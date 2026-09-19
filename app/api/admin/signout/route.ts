import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearedCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  cookies().set(clearedCookie());
  return NextResponse.redirect(new URL('/admin/login', request.url), { status: 303 });
}
