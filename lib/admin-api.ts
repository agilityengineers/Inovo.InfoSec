import 'server-only';

import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth';

/** Wraps an admin route handler so every one of them is behind the same check. */
export function adminRoute<T>(handler: (body: T, request: Request) => Promise<unknown>) {
  return async function route(request: Request) {
    if (!requireAdminApi()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body = {} as T;
    if (request.method !== 'GET' && request.headers.get('content-type')?.includes('json')) {
      try {
        body = (await request.json()) as T;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    }
    try {
      const result = await handler(body, request);
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Request failed' },
        { status: 500 },
      );
    }
  };
}
