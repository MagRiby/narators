-- ================================================================
-- Full-Text Search & Performance Index Setup
-- Run this ONCE after Prisma migrations and data import.
-- psql $DATABASE_URL -f scripts/build-fts-index.sql
-- ================================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram similarity
CREATE EXTENSION IF NOT EXISTS unaccent;    -- accent-insensitive search

-- ── Add tsvector column if not already present ────────────────
ALTER TABLE hadiths
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ── Populate all rows ─────────────────────────────────────────
UPDATE hadiths
SET search_vector =
  to_tsvector('simple', COALESCE(text_ar, ''))
  || to_tsvector('simple', COALESCE(text_en, ''))
WHERE search_vector IS NULL;

-- ── GIN index for FTS (@@ queries) ───────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadiths_fts
  ON hadiths USING GIN (search_vector);

-- ── GIN trigram index for Arabic partial-word / LIKE matching ─
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadiths_ar_trgm
  ON hadiths USING GIN (text_ar gin_trgm_ops);

-- ── GIN trigram index for English ────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadiths_en_trgm
  ON hadiths USING GIN (text_en gin_trgm_ops);

-- ── Auto-update trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_hadith_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', COALESCE(NEW.text_ar, ''))
    || to_tsvector('simple', COALESCE(NEW.text_en, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hadiths_fts ON hadiths;
CREATE TRIGGER trg_hadiths_fts
  BEFORE INSERT OR UPDATE OF text_ar, text_en ON hadiths
  FOR EACH ROW
  EXECUTE FUNCTION update_hadith_search_vector();

-- ── Narrator name trigram index ───────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narrators_ar_trgm
  ON narrators USING GIN (name_ar gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narrators_en_trgm
  ON narrators USING GIN (name_en gin_trgm_ops);

-- ── Performance indexes ───────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadiths_book_grade
  ON hadiths (book_id, grade);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadiths_chapter
  ON hadiths (chapter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hadith_narrators_narrator
  ON hadith_narrators (narrator_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narrator_rel_teacher
  ON narrator_relationships (teacher_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narrator_rel_student
  ON narrator_relationships (student_id);

-- ================================================================
-- Example queries to validate setup
-- ================================================================

-- Full-text search (Arabic):
-- SELECT id, text_ar, ts_rank(search_vector, q) AS rank
-- FROM hadiths, to_tsquery('simple', 'الصلاة') q
-- WHERE search_vector @@ q
-- ORDER BY rank DESC LIMIT 10;

-- Trigram similarity (partial Arabic word):
-- SELECT id, text_ar, similarity(text_ar, 'الصل') AS sim
-- FROM hadiths
-- WHERE text_ar % 'الصل'
-- ORDER BY sim DESC LIMIT 10;

-- Narrator name fuzzy search:
-- SELECT id, name_ar, name_en, reliability
-- FROM narrators
-- WHERE name_ar % 'أبو هريرة'
-- ORDER BY similarity(name_ar, 'أبو هريرة') DESC
-- LIMIT 5;
