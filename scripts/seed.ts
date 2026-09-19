/**
 * Seeds brands, assessment config, verticals and the qualification rule.
 *
 *   npm run db:push && npm run db:seed
 *
 * Idempotent: re-running updates the seeded rows rather than duplicating them,
 * so it is safe to run after every deploy.
 */

import { db, hasDatabase, schema } from '@/db';
import { SEED_BRANDS } from '@/lib/data/brands';
import { DEFAULT_SCORING } from '@/lib/data/msp';
import { VERTICALS, DEFAULT_QUAL } from '@/lib/data/client';

async function main() {
  if (!hasDatabase()) {
    console.error('DATABASE_URL is not set. Add it to your Replit secrets (or .env) and retry.');
    process.exit(1);
  }

  const database = db();

  for (const brand of Object.values(SEED_BRANDS)) {
    await database
      .insert(schema.brands)
      .values({ ...brand, ctaPartnerUrl: brand.ctaPartnerUrl ?? null, showPartnerCta: brand.showPartnerCta ?? false })
      .onConflictDoUpdate({
        target: schema.brands.id,
        set: {
          ...brand,
          ctaPartnerUrl: brand.ctaPartnerUrl ?? null,
          showPartnerCta: brand.showPartnerCta ?? false,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`  brands              ${Object.keys(SEED_BRANDS).length}`);

  for (const vertical of Object.values(VERTICALS)) {
    await database
      .insert(schema.verticals)
      .values({ id: vertical.id, label: vertical.label, config: vertical })
      .onConflictDoUpdate({
        target: schema.verticals.id,
        set: { label: vertical.label, config: vertical, updatedAt: new Date() },
      });
  }
  console.log(`  verticals           ${Object.keys(VERTICALS).length}`);

  await database
    .insert(schema.assessments)
    .values({ key: 'msp-v1', version: 1, active: true, config: DEFAULT_SCORING })
    .onConflictDoNothing();
  await database
    .insert(schema.assessments)
    .values({
      key: 'client-v1',
      version: 1,
      active: true,
      config: { functions: 6, questionsPerFunction: 4, equalWeights: true },
    })
    .onConflictDoNothing();
  console.log('  assessments         msp-v1, client-v1');

  await database
    .insert(schema.qualificationRules)
    .values({ key: 'client-v1', rule: DEFAULT_QUAL })
    .onConflictDoNothing();
  console.log('  qualification rule  client-v1');

  console.log('\nSeed complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
