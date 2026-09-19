/**
 * Applies the SQL migrations in `db/migrations`.
 *
 *   npm run db:migrate
 *
 * This is the production path: migrations are versioned files committed to the
 * repo, applied in order, and recorded, so a deploy is repeatable and a review
 * can see exactly what changed. `npm run db:push` diffs the schema straight
 * against the database instead — quick during development, not for production.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to your Replit secrets (or .env.local) and retry.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? undefined : { rejectUnauthorized: false },
  });

  try {
    await migrate(drizzle(pool), { migrationsFolder: 'db/migrations' });
    console.log('Migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
