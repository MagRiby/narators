/**
 * Links narrators to hadiths by matching name_ar against Arabic hadith text.
 *
 * Strategy: fetch all hadiths + all narrators once, strip diacritics locally
 * in JS (fast), find matches in memory, then bulk-insert links in batches.
 * This avoids repeated expensive regexp_replace calls on the cloud DB.
 *
 * Run after import-narrators.ts:
 *   npx ts-node scripts/link-narrators.ts
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) loadEnv({ path: envPath, override: false });

const prisma = new PrismaClient();

// Strip Arabic diacritics (U+064B–U+065F, U+0670) from a string
function stripDiacritics(str: string): string {
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
}

async function main() {
  // ── Fetch all hadiths (id + stripped text_ar) ──────────────────────
  console.log('\n📥 Fetching all hadiths…');
  const hadiths = await prisma.hadith.findMany({
    select: { id: true, text_ar: true },
  });
  console.log(`   → ${hadiths.length} hadiths loaded`);

  // Pre-compute stripped text for all hadiths (done once in memory)
  const strippedHadiths = hadiths.map(h => ({
    id: h.id,
    text: stripDiacritics(h.text_ar),
  }));

  // ── Fetch narrators with Arabic names ──────────────────────────────
  console.log('📥 Fetching narrators with Arabic names…');
  const narrators = await prisma.narrator.findMany({
    select: { id: true, name_ar: true },
    where: { name_ar: { not: '' } },
  });
  console.log(`   → ${narrators.length} narrators to match`);

  // ── Fetch existing links to avoid re-creating them ─────────────────
  console.log('📥 Fetching existing hadith-narrator links…');
  const existingLinks = await prisma.hadithNarrator.findMany({
    select: { hadith_id: true, narrator_id: true },
  });
  const existingSet = new Set(existingLinks.map(l => `${l.hadith_id}:${l.narrator_id}`));
  console.log(`   → ${existingSet.size} existing links (will skip)`);

  // ── Match in memory ────────────────────────────────────────────────
  console.log('\n🔗 Matching narrator names in hadith text…');

  const toInsert: { hadith_id: number; narrator_id: number; position: number }[] = [];

  for (let i = 0; i < narrators.length; i++) {
    const n = narrators[i];
    if (!n.name_ar) continue;

    for (const h of strippedHadiths) {
      if (h.text.includes(n.name_ar) && !existingSet.has(`${h.id}:${n.id}`)) {
        toInsert.push({ hadith_id: h.id, narrator_id: n.id, position: 0 });
        existingSet.add(`${h.id}:${n.id}`); // prevent duplicate from this run
      }
    }

    if ((i + 1) % 500 === 0) {
      process.stdout.write(`   ${i + 1} / ${narrators.length} narrators matched, ${toInsert.length} links found…\r`);
    }
  }

  console.log(`\n   ✓ ${toInsert.length} new links found`);

  if (toInsert.length === 0) {
    console.log('\n✅ Nothing to insert.');
    return;
  }

  // ── Bulk insert in batches of 500 ──────────────────────────────────
  console.log('\n💾 Inserting links in batches…');
  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    await prisma.hadithNarrator.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += batch.length;
    process.stdout.write(`   ${inserted} / ${toInsert.length} inserted…\r`);
  }

  console.log(`\n   ✓ ${inserted} hadith-narrator links inserted`);
  console.log('\n✅ Linking complete!');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
