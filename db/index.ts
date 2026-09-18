/**
 * Database handle.
 *
 * `DATABASE_URL` comes from Replit secrets (its built-in Postgres is Neon). When
 * it is absent the app still boots against an in-memory store so a fresh clone
 * runs with `npm run dev` before anyone has provisioned a database — see
 * `lib/repo.ts`. Production refuses to start without it.
 */

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: Database | undefined;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!database) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Replit/Neon terminate idle connections; keep the pool small and patient.
      max: Number(process.env.PGPOOL_MAX || 5),
      ssl: process.env.PGSSL === 'disable' ? undefined : { rejectUnauthorized: false },
    });
    database = drizzle(pool, { schema });
  }
  return database;
}

export { schema };
