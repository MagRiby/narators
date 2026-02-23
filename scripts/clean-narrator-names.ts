/**
 * Cleans up narrator name_ar values extracted by extract-isnad-narrators.ts.
 *
 * Problems fixed:
 *  1. Trailing verbs:  يقول / يحدث / يذكر / يروي etc. got captured as part of the name
 *  2. Trailing religious particles: رضي / عنه / قال etc.
 *  3. Formatting artifacts: kashida (ـ), directional marks (U+200F …), stray dots/commas
 *  4. After cleaning, if two narrators end up with the same name_ar, merge the one
 *     with fewer hadiths into the one with more, then delete the duplicate.
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) loadEnv({ path: envPath, override: false });

const prisma = new PrismaClient();

// ── Noise patterns stripped from the END of extracted names ──────────────────
// Order matters: applied left-to-right.
const NOISE_PATTERNS: RegExp[] = [
  // Trailing verbs / clauses that slipped past the comma boundary
  /\s+(يقول|يحدث|يروي|يذكر|يخبر|يقال|يقل|حدثه|أخبره|قال|ثنا|أنا).*$/u,
  // Religious particles
  /\s+(رضي|عنه|عنهما|عنها|أنه|أن)\s.*$/u,
  // Stray trailing words "ثم" / "أيضا" etc.
  /\s+(ثم|أيضا|أيضاً)\s.*$/u,
  // Kashida (tatweel) and Unicode directional / invisible marks anywhere in name
  /[\u0640\u200B-\u200F\u202A-\u202E\uFEFF]+/gu,
  // Stray trailing punctuation and Arabic text markers
  /[\s.,،؛؟!\u200C\u200D\u064E-\u065F\u0670]+$/u,
];

function cleanName(raw: string): string {
  let name = raw;
  for (const re of NOISE_PATTERNS) {
    name = name.replace(re, '');
  }
  name = name.trim();
  // Remove any trailing non-Arabic chars
  name = name.replace(/[^ء-ي\s]+$/u, '').trim();
  return name;
}

async function main() {
  console.log('\n📥 Loading isnad narrators…');
  const narrators = await prisma.narrator.findMany({
    where:  { source_id: { startsWith: 'isnad:' } },
    select: { id: true, name_ar: true, source_id: true, _count: { select: { hadiths: true } } },
  });
  console.log(`   → ${narrators.length} isnad narrators`);

  // ── Step 1: identify narrators whose name changes after cleaning ─────────
  type Dirty = { id: number; name_ar: string; cleaned: string; count: number };
  const dirty: Dirty[] = [];

  for (const n of narrators) {
    const cleaned = cleanName(n.name_ar);
    if (cleaned !== n.name_ar && cleaned.length > 1) {
      dirty.push({ id: n.id, name_ar: n.name_ar, cleaned, count: n._count.hadiths });
    }
  }
  console.log(`   → ${dirty.length} narrators need name cleaning`);
  console.log('\nSamples:');
  dirty.slice(0, 8).forEach(d =>
    console.log(`   "${d.name_ar}" → "${d.cleaned}" (${d.count} hadiths)`)
  );

  if (dirty.length === 0) {
    console.log('\n✅ Nothing to clean.');
    return;
  }

  // ── Step 2: build a map of cleaned_name → existing canonical narrator ─────
  // "canonical" = already exists with that exact name_ar
  const nameToNarrator = new Map<string, { id: number; count: number }>();
  for (const n of narrators) {
    const existing = nameToNarrator.get(n.name_ar);
    if (!existing || n._count.hadiths > existing.count) {
      nameToNarrator.set(n.name_ar, { id: n.id, count: n._count.hadiths });
    }
  }

  let renamed = 0;
  let merged  = 0;
  let deleted = 0;

  for (const d of dirty) {
    const canonical = nameToNarrator.get(d.cleaned);

    if (canonical && canonical.id !== d.id) {
      // ── Case A: a narrator with the cleaned name already exists → MERGE ──
      // Move all hadith links from the dirty narrator to the canonical one
      const links = await prisma.hadithNarrator.findMany({
        where: { narrator_id: d.id },
        select: { hadith_id: true, position: true },
      });

      for (const link of links) {
        await prisma.hadithNarrator.upsert({
          where: { hadith_id_narrator_id: { hadith_id: link.hadith_id, narrator_id: canonical.id } },
          update: {},
          create: { hadith_id: link.hadith_id, narrator_id: canonical.id, position: link.position },
        });
      }

      // Delete the links on the dirty narrator, then the narrator itself
      await prisma.hadithNarrator.deleteMany({ where: { narrator_id: d.id } });
      await prisma.narrator.delete({ where: { id: d.id } });

      merged++;
      deleted++;
    } else {
      // ── Case B: no existing canonical narrator → just RENAME ──────────────
      const newSourceId = `isnad:${d.cleaned.replace(/\s+/g, '_')}`;

      // Check if the new source_id is already taken by another narrator
      const conflict = await prisma.narrator.findFirst({
        where: { source_id: newSourceId, id: { not: d.id } },
        select: { id: true, _count: { select: { hadiths: true } } },
      });

      if (conflict) {
        // Another narrator already has this exact source_id/name → merge into it
        const links = await prisma.hadithNarrator.findMany({
          where: { narrator_id: d.id },
          select: { hadith_id: true, position: true },
        });
        for (const link of links) {
          await prisma.hadithNarrator.upsert({
            where: { hadith_id_narrator_id: { hadith_id: link.hadith_id, narrator_id: conflict.id } },
            update: {},
            create: { hadith_id: link.hadith_id, narrator_id: conflict.id, position: link.position },
          });
        }
        await prisma.hadithNarrator.deleteMany({ where: { narrator_id: d.id } });
        await prisma.narrator.delete({ where: { id: d.id } });
        merged++;
        deleted++;
      } else {
        // Safe to rename
        await prisma.narrator.update({
          where: { id: d.id },
          data: { name_ar: d.cleaned, source_id: newSourceId },
        });
        // Register the new name in our map so subsequent duplicates merge into this
        nameToNarrator.set(d.cleaned, { id: d.id, count: d.count });
        renamed++;
      }
    }

    if ((renamed + merged) % 100 === 0 && renamed + merged > 0) {
      process.stdout.write(`   ${renamed} renamed, ${merged} merged…\r`);
    }
  }

  console.log(`\n   ✓ ${renamed} narrators renamed`);
  console.log(`   ✓ ${merged} narrators merged into canonical entries`);
  console.log(`   ✓ ${deleted} duplicate narrator records deleted`);

  // ── Step 3: final count ─────────────────────────────────────────────────
  const total = await prisma.narrator.count({ where: { source_id: { startsWith: 'isnad:' } } });
  console.log(`\n   Total isnad narrators remaining: ${total}`);
  console.log('\n✅ Narrator name cleanup complete!');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
