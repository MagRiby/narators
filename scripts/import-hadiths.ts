/**
 * Import script: hadiths + chapters + books + narrators
 *
 * Source: https://github.com/AhmedBaset/hadith-json
 *   50,884 hadiths from 9 books, scraped from Sunnah.com.
 *   Each hadith has a clean narrator field and proper English translation.
 *
 * Usage (from monorepo root):
 *   npm run import:hadiths              — import all 9 books
 *   npm run import:hadiths -- bukhari   — import one book
 */

import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { config as loadEnv } from 'dotenv';
import { PrismaClient, Grade } from '@prisma/client';

// Ensure .env is loaded even when turbo changes cwd
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) loadEnv({ path: envPath, override: false });

const prisma = new PrismaClient();

const RAW_BASE =
  'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book/the_9_books';

// ── Book catalogue ─────────────────────────────────────────────
// fileSlug  = filename in the GitHub repo
// slug      = our internal DB slug
const BOOKS = [
  { fileSlug: 'bukhari',  slug: 'bukhari'  },
  { fileSlug: 'muslim',   slug: 'muslim'   },
  { fileSlug: 'abudawud', slug: 'abudawud' },
  { fileSlug: 'tirmidhi', slug: 'tirmidhi' },
  { fileSlug: 'nasai',    slug: 'nasai'    },
  { fileSlug: 'ibnmajah', slug: 'ibnmajah' },
  { fileSlug: 'malik',    slug: 'malik'    },
  { fileSlug: 'ahmed',    slug: 'ahmad'    },
  { fileSlug: 'darimi',   slug: 'darimi'   },
] as const;

type BookEntry = typeof BOOKS[number];

// ── Helpers ────────────────────────────────────────────────────

/**
 * Extract a narrator name from the raw narrator string.
 * Handles Sunnah.com narrator field formats across books:
 *   Bukhari/Abu Dawud/Tirmidhi/Nasai:
 *     "Narrated Abu Huraira:"              → "Abu Huraira"
 *   Muslim:
 *     "Abu Huraira reported:"              → "Abu Huraira"
 *   Ibn Majah:
 *     "It was narrated that Abu Huraira said:"  → "Abu Huraira"
 *     "It was narrated from Abu Huraira that:"  → "Abu Huraira"
 */
function parseNarratorName(raw: string | undefined): string | null {
  if (!raw) return null;
  let m: RegExpMatchArray | null;
  // "Narrated X:" (Bukhari-style)
  m = raw.match(/^Narrated (.+?)(?:\s+said)?:/);
  if (m) return m[1].trim();
  // "X reported:" (Muslim-style)
  m = raw.match(/^(.+?)\s+reported:/);
  if (m) return m[1].trim();
  // "It was narrated that X said:" or "…that X said:"
  m = raw.match(/\bnarrated that (.+?)(?:\s+said)?:/i);
  if (m) return m[1].trim();
  // "It was narrated from X that:"
  m = raw.match(/\bnarrated from (.+?) that:/i);
  if (m) return m[1].trim();
  return null;
}

async function downloadBook(fileSlug: string): Promise<any> {
  const url = `${RAW_BASE}/${fileSlug}.json`;
  console.log(`   Downloading ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

// ── Import a single book ───────────────────────────────────────
async function importBook(entry: BookEntry): Promise<void> {
  const data = await downloadBook(entry.fileSlug);

  const meta       = data.metadata as any;
  const jsonChaps  = (data.chapters  as any[]) ?? [];
  const jsonHadiths= (data.hadiths   as any[]) ?? [];

  const name_en  = meta?.english?.title  ?? entry.slug;
  const name_ar  = meta?.arabic?.title   ?? '';
  const author_en= meta?.english?.author ?? null;
  const author_ar= meta?.arabic?.author  ?? null;

  console.log(`\n📖 ${name_en} — ${jsonHadiths.length} hadiths, ${jsonChaps.length} chapters`);

  // ── Upsert book ────────────────────────────────────────────
  const dbBook = await prisma.book.upsert({
    where:  { slug: entry.slug },
    update: { name_en, name_ar },
    create: { slug: entry.slug, name_en, name_ar, author_en, author_ar, hadith_count: 0 },
  });

  // ── Upsert chapters ────────────────────────────────────────
  // Map JSON chapter id → DB chapter id
  const chapMap = new Map<number, number>(); // jsonChapId → dbChapId

  let chapFallbackNum = 10000; // fallback number for chapters missing an id
  for (const c of jsonChaps) {
    const chapNum: number = (c.id != null) ? c.id : ++chapFallbackNum;
    const dbChap = await prisma.chapter.upsert({
      where:  { book_id_number: { book_id: dbBook.id, number: chapNum } },
      update: { name_ar: c.arabic ?? '', name_en: c.english ?? null },
      create: {
        book_id:  dbBook.id,
        number:   chapNum,
        name_ar:  c.arabic  ?? '',
        name_en:  c.english ?? null,
      },
    });
    if (c.id != null) chapMap.set(c.id, dbChap.id);
  }

  // ── Narrator cache (name_en → DB narrator id) ──────────────
  const narratorCache = new Map<string, number>(); // narratorName → dbNarrator.id

  async function getOrCreateNarrator(name: string): Promise<number> {
    if (narratorCache.has(name)) return narratorCache.get(name)!;

    const sourceId = `narrator:${entry.slug}:${name.toLowerCase().replace(/\s+/g, '_')}`;
    const n = await prisma.narrator.upsert({
      where:  { source_id: sourceId },
      update: { name_en: name },
      create: { source_id: sourceId, name_ar: '', name_en: name },
    });

    narratorCache.set(name, n.id);
    return n.id;
  }

  // ── Import hadiths ─────────────────────────────────────────
  let imported = 0;

  for (const h of jsonHadiths) {
    const idInBook: number  = h.idInBook ?? h.id ?? imported + 1;
    const syntheticId       = dbBook.id * 1_000_000 + idInBook;
    const chapter_id        = chapMap.get(h.chapterId) ?? null;
    const narratorRaw       = h.english?.narrator as string | undefined;
    const narratorName      = parseNarratorName(narratorRaw);

    // Combine narrator line + text into full English translation
    const text_en = narratorRaw
      ? `${narratorRaw} ${h.english?.text ?? ''}`.trim()
      : (h.english?.text ?? null);

    await prisma.hadith.upsert({
      where:  { id: syntheticId },
      update: { text_ar: h.arabic ?? '', text_en, chapter_id },
      create: {
        id:             syntheticId,
        book_id:        dbBook.id,
        chapter_id,
        number:         syntheticId,
        number_in_book: idInBook,
        text_ar:        h.arabic ?? '',
        text_en,
        grade:          Grade.unknown,
        reference:      `${name_en} ${idInBook}`,
        source_id:      `${entry.slug}:${idInBook}`,
      },
    });

    // Link narrator
    if (narratorName) {
      const narratorId = await getOrCreateNarrator(narratorName);
      await prisma.hadithNarrator.upsert({
        where:  { hadith_id_narrator_id: { hadith_id: syntheticId, narrator_id: narratorId } },
        update: {},
        create: { hadith_id: syntheticId, narrator_id: narratorId, position: 0 },
      }).catch(() => {}); // ignore if already exists
    }

    imported++;
    if (imported % 500 === 0) process.stdout.write(`   ${imported} / ${jsonHadiths.length}…\r`);
  }

  // ── Update hadith count ────────────────────────────────────
  await prisma.book.update({
    where: { id: dbBook.id },
    data:  { hadith_count: imported },
  });

  console.log(`   ✓ ${imported} hadiths, ${chapMap.size} chapters, ${narratorCache.size} narrators`);
}

// ── Main ───────────────────────────────────────────────────────
async function main(): Promise<void> {
  const filter = process.argv[2];

  const booksToImport = filter
    ? BOOKS.filter((b) => b.slug === filter || b.fileSlug === filter)
    : [...BOOKS];

  if (booksToImport.length === 0) {
    console.error(`❌ Unknown book: "${filter}"`);
    console.error(`   Available: ${BOOKS.map((b) => b.slug).join(', ')}`);
    process.exit(1);
  }

  for (const book of booksToImport) {
    await importBook(book);
  }

  console.log('\n✅ Import complete!');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
