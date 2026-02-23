/**
 * Import script: narrators + isnad relationships
 *
 * Expects two files in ../data/:
 *   narrators.json  — array of narrator objects
 *   isnad-edges.json — array of { teacher_id, student_id } source-ID pairs
 *
 * These can be sourced from:
 *   - github.com/IslamicData/isnad-datasets
 *   - github.com/Hadith-Data-Sets (narrator sheets)
 *   - A custom extraction from hadith text (see extractIsnad in web/src/lib/utils.ts)
 *
 * Usage:
 *   cd scripts && npx ts-node import-narrators.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, Generation, Reliability } from '@prisma/client';

const prisma = new PrismaClient();

// ── Enum normalisers ──────────────────────────────────────────
function mapReliability(raw?: string): Reliability {
  if (!raw) return Reliability.unknown;
  const l = raw.toLowerCase();
  if (l.includes('thiqa') || l.includes('trustworthy'))  return Reliability.thiqah;
  if (l.includes('saduq') || l.includes('truthful'))     return Reliability.saduq;
  if (l.includes('matruk') || l.includes('abandoned'))   return Reliability.matruk;
  if (l.includes('da') || l.includes('weak'))            return Reliability.daif;
  return Reliability.unknown;
}

function mapGeneration(raw?: string): Generation {
  if (!raw) return Generation.other;
  const l = raw.toLowerCase();
  if (l.includes('sahabi') || l.includes('companion'))   return Generation.sahabi;
  if (l.includes("tabi' al") || l.includes('tabi-tabi')) return Generation.tabi_tabii;
  if (l.includes("tabi") || l.includes('successor'))     return Generation.tabii;
  return Generation.other;
}

// ── Import narrators ──────────────────────────────────────────
async function importNarrators(dataDir: string): Promise<void> {
  const file = path.join(dataDir, 'narrators.json');
  if (!fs.existsSync(file)) {
    console.warn('⚠ narrators.json not found — skipping narrator import');
    return;
  }

  const narrators: any[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log(`\n👤 Importing ${narrators.length} narrators…`);

  let count = 0;
  for (const n of narrators) {
    await prisma.narrator.upsert({
      where:  { source_id: String(n.id ?? n.source_id ?? count) },
      update: {
        name_ar:       n.name_ar ?? n.arabic_name   ?? n.name ?? '',
        name_en:       n.name_en ?? n.english_name  ?? null,
        kunya_ar:      n.kunya_ar ?? n.kunya         ?? null,
        kunya_en:      n.kunya_en                    ?? null,
        laqab:         n.laqab ?? n.title            ?? null,
        birth_year_h:  n.birth_year  ?? n.born_h     ?? null,
        death_year_h:  n.death_year  ?? n.died_h     ?? null,
        birth_year_ce: n.birth_ce                    ?? null,
        death_year_ce: n.death_ce                    ?? null,
        reliability:   mapReliability(n.reliability ?? n.grade ?? n.status),
        biography:     n.biography   ?? n.bio        ?? null,
        biography_ar:  n.biography_ar                ?? null,
        generation:    mapGeneration(n.generation    ?? n.level ?? n.tabaqat),
        region:        n.region      ?? n.city       ?? null,
      },
      create: {
        source_id:     String(n.id ?? n.source_id ?? count),
        name_ar:       n.name_ar ?? n.arabic_name   ?? n.name ?? '',
        name_en:       n.name_en ?? n.english_name  ?? null,
        kunya_ar:      n.kunya_ar ?? n.kunya         ?? null,
        kunya_en:      n.kunya_en                    ?? null,
        laqab:         n.laqab ?? n.title            ?? null,
        birth_year_h:  n.birth_year  ?? n.born_h     ?? null,
        death_year_h:  n.death_year  ?? n.died_h     ?? null,
        birth_year_ce: n.birth_ce                    ?? null,
        death_year_ce: n.death_ce                    ?? null,
        reliability:   mapReliability(n.reliability ?? n.grade ?? n.status),
        biography:     n.biography   ?? n.bio        ?? null,
        biography_ar:  n.biography_ar                ?? null,
        generation:    mapGeneration(n.generation    ?? n.level ?? n.tabaqat),
        region:        n.region      ?? n.city       ?? null,
      },
    });
    count++;
    if (count % 200 === 0) process.stdout.write(`   ${count}…\r`);
  }

  console.log(`   ✓ ${count} narrators imported`);
}

// ── Import isnad edges ────────────────────────────────────────
async function importIsnadEdges(dataDir: string): Promise<void> {
  const file = path.join(dataDir, 'isnad-edges.json');
  if (!fs.existsSync(file)) {
    console.warn('⚠ isnad-edges.json not found — skipping isnad graph import');
    return;
  }

  const edges: { teacher_id: string | number; student_id: string | number }[] =
    JSON.parse(fs.readFileSync(file, 'utf-8'));

  console.log(`\n🔗 Importing ${edges.length} isnad relationships…`);

  let count = 0;
  let skipped = 0;
  for (const edge of edges) {
    const [teacher, student] = await Promise.all([
      prisma.narrator.findFirst({ where: { source_id: String(edge.teacher_id) }, select: { id: true } }),
      prisma.narrator.findFirst({ where: { source_id: String(edge.student_id) }, select: { id: true } }),
    ]);

    if (!teacher || !student) { skipped++; continue; }

    await prisma.narratorRelationship.upsert({
      where: {
        teacher_id_student_id: { teacher_id: teacher.id, student_id: student.id },
      },
      update: {},
      create: { teacher_id: teacher.id, student_id: student.id },
    });
    count++;
  }

  console.log(`   ✓ ${count} edges imported (${skipped} skipped — missing narrator)`);
}

// ── Link narrators to hadiths via name matching ───────────────
async function linkNarratorsToHadiths(): Promise<void> {
  console.log('\n🔗 Linking narrators to hadiths by name match…');

  const narrators = await prisma.narrator.findMany({
    select: { id: true, name_ar: true },
    where:  { name_ar: { not: '' } },
  });

  let linked = 0;
  for (const narrator of narrators) {
    // Find hadiths where the Arabic text contains this narrator's name
    const hadiths = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM hadiths
      WHERE text_ar LIKE ${'%' + narrator.name_ar + '%'}
        AND NOT EXISTS (
          SELECT 1 FROM hadith_narrators
          WHERE hadith_id = hadiths.id AND narrator_id = ${narrator.id}
        )
      LIMIT 200
    `;

    for (const h of hadiths) {
      await prisma.hadithNarrator.upsert({
        where: { hadith_id_narrator_id: { hadith_id: h.id, narrator_id: narrator.id } },
        update: {},
        create: { hadith_id: h.id, narrator_id: narrator.id, position: 0 },
      }).catch(() => {});
      linked++;
    }
  }

  console.log(`   ✓ ${linked} hadith-narrator links created`);
}

// ── Main ──────────────────────────────────────────────────────
async function main(): Promise<void> {
  const dataDir = path.resolve(__dirname, '../data');

  await importNarrators(dataDir);
  await importIsnadEdges(dataDir);
  await linkNarratorsToHadiths();

  console.log('\n✅ Narrator import complete!');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
