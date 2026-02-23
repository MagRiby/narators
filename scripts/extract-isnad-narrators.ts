/**
 * Extracts narrator names from Arabic hadith isnad chains and creates
 * narrator records + hadith_narrators links.
 *
 * Approach: parse transmitting verbs in the Arabic text to identify narrator
 * names directly from the source text, rather than relying on pre-stored names.
 *
 * Transmitting verb patterns used:
 *   حدثنا / أخبرنا / حدثني / أخبرني / سمعت → narrator name follows until ، or next verb
 *   عن → narrator name follows (1–3 words) until ، or next verb
 *
 * Data sources used:
 *   hadiths.text_ar — already in DB (from import-hadiths.ts via AhmedBaset/hadith-json)
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) loadEnv({ path: envPath, override: false });

const prisma = new PrismaClient();

// Strip Arabic diacritics
function stripDiacritics(str: string): string {
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
}

// Words that appear after "عن" but are NOT narrator names
const NOT_NARRATOR = new Set([
  'النبي', 'رسول', 'الله', 'ذلك', 'هذا', 'هذه', 'أن', 'كل', 'بعض',
  'أهل', 'غير', 'مثل', 'نفسه', 'نفسها', 'ربه', 'أمه', 'أبيه', 'أبيها',
]);

/**
 * Extract narrator names from stripped (no-diacritics) Arabic isnad text.
 * Returns array of { name, position } pairs.
 */
function extractIsnadNarrators(text: string): { name: string; position: number }[] {
  const results: { name: string; position: number }[] = [];
  let pos = 0;

  // Pattern 1: transmitting verbs — name follows until ، or transmitting verb
  const verbRegex = /(?:حدثنا|أخبرنا|حدثني|أخبرني|حدثه|أخبره|أنبأنا|سمعت|ثنا|أنا)\s+([^،\n]+?)(?=\s*،|\s*\n|$)/g;
  let m: RegExpExecArray | null;

  while ((m = verbRegex.exec(text)) !== null) {
    let name = m[1].trim();
    // Remove clarifications: "يعني ..." / "وهو ..." / "وهي ..."
    name = name.replace(/\s+(?:يعني|وهو|وهي|ويقال|ويقول|قال|أي|أعني).*$/, '').trim();
    // Limit to 5 words max
    name = name.split(/\s+/).slice(0, 5).join(' ');
    if (name.length > 1) {
      results.push({ name, position: pos++ });
    }
  }

  // Pattern 2: "عن X" — typically one narrator name (1–4 words)
  const anRegex = /(?<!\w)عن\s+((?:[^\s،\n]+\s*){1,4})(?=،|$|\n)/g;
  while ((m = anRegex.exec(text)) !== null) {
    let name = m[1].trim();
    name = name.replace(/\s+(?:يعني|وهو|قال|أن|أنه).*$/, '').trim();
    name = name.split(/\s+/).slice(0, 4).join(' ');
    const firstWord = name.split(/\s+/)[0];
    if (name.length > 1 && !NOT_NARRATOR.has(firstWord)) {
      results.push({ name, position: pos++ });
    }
  }

  // Deduplicate (keep first occurrence position)
  const seen = new Map<string, number>();
  for (const r of results) {
    if (!seen.has(r.name)) seen.set(r.name, r.position);
  }

  return [...seen.entries()].map(([name, position]) => ({ name, position }));
}

async function main() {
  console.log('\n📥 Fetching all hadiths…');
  const hadiths = await prisma.hadith.findMany({
    select: { id: true, text_ar: true },
  });
  console.log(`   → ${hadiths.length} hadiths`);

  // Cache: name_ar → narrator DB id
  const narratorCache = new Map<string, number>();

  async function getOrCreateNarrator(nameAr: string): Promise<number> {
    if (narratorCache.has(nameAr)) return narratorCache.get(nameAr)!;
    // Try to find existing narrator with this exact name_ar
    let narrator = await prisma.narrator.findFirst({ where: { name_ar: nameAr }, select: { id: true } });
    if (!narrator) {
      // Create a minimal narrator record
      narrator = await prisma.narrator.create({
        data: { name_ar: nameAr, source_id: `isnad:${nameAr.replace(/\s+/g, '_')}` },
        select: { id: true },
      });
    }
    narratorCache.set(nameAr, narrator.id);
    return narrator.id;
  }

  console.log('\n🔗 Extracting isnad narrators and linking to hadiths…');

  const toInsert: { hadith_id: number; narrator_id: number; position: number }[] = [];
  let totalExtracted = 0;

  for (let i = 0; i < hadiths.length; i++) {
    const h = hadiths[i];
    const stripped = stripDiacritics(h.text_ar);
    const narrators = extractIsnadNarrators(stripped);

    for (const { name, position } of narrators) {
      const narratorId = await getOrCreateNarrator(name);
      toInsert.push({ hadith_id: h.id, narrator_id: narratorId, position });
      totalExtracted++;
    }

    if ((i + 1) % 2000 === 0) {
      process.stdout.write(`   ${i + 1} / ${hadiths.length} hadiths processed, ${totalExtracted} narrator links found…\r`);
    }
  }

  console.log(`\n   ✓ ${totalExtracted} links from ${narratorCache.size} unique narrators`);

  // Bulk insert in batches
  console.log('\n💾 Inserting in batches…');
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    await prisma.hadithNarrator.createMany({ data: toInsert.slice(i, i + BATCH), skipDuplicates: true });
    inserted += Math.min(BATCH, toInsert.length - i);
    process.stdout.write(`   ${inserted} / ${toInsert.length} inserted…\r`);
  }

  console.log(`\n   ✓ ${inserted} records inserted`);
  console.log('\n✅ Isnad extraction complete!');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
