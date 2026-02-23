/**
 * Converts raw CSV narrator datasets into narrators.json + isnad-edges.json
 * for use with import-narrators.ts
 *
 * DATA SOURCES
 * ─────────────────────────────────────────────────────────────────────────
 * 1. kaggle_rawis.csv  (primary — 24,325 narrators)
 *    Source : OmarShafie/hadith GitHub repo
 *             (mirrors Kaggle muslimscholars.info dataset, CC0 Public Domain)
 *    URL    : https://raw.githubusercontent.com/OmarShafie/hadith/master/data/kaggle_rawis.csv
 *    Fields : scholar_indx, name (English + embedded Arabic in parentheses),
 *             grade, students_inds, teachers_inds,
 *             birth_date_hijri, death_date_hijri, birth_place
 *    Used for: narrator list, Arabic name extraction, isnad edges, birth/death dates
 *
 * 2. rawi_data.csv  (reliability enrichment — 18,511 narrators)
 *    Source : OmarShafie/hadith GitHub repo
 *    URL    : https://raw.githubusercontent.com/OmarShafie/hadith/master/data/rawi_data.csv
 *    Fields : name (Arabic), kunyah, grade_ibn_hajar, grade_thahabi,
 *             date_birth, date_death, tabaqah, place_iqama
 *    Used for: Ibn Hajar reliability grades matched by Arabic name prefix
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../data');

// ── CSV parser (handles quoted fields with embedded commas) ────────────
function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const row  = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? '').trim(); });
    return row;
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Extract Arabic name from kaggle "English ( arabic_name ( honorific )" format.
 * Grabs text between the 1st and 2nd opening parenthesis, keeps only Arabic.
 */
function extractArabicName(name) {
  if (!name) return '';
  const fp = name.indexOf('(');
  if (fp === -1) return '';
  const after = name.slice(fp + 1);
  const sp    = after.indexOf('(');
  const section = sp !== -1 ? after.slice(0, sp) : after;
  const matches = section.match(/[\u0600-\u06FF][\u0600-\u06FF\s\u064B-\u065F\u0670]*/g);
  return matches ? matches.join(' ').trim() : '';
}

// Parse first Hijri year out of strings like "220 هـ ، وقيل : 221 هـ" or plain "53"
function parseYear(str) {
  if (!str) return null;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// Map grade text → Reliability enum value
function mapReliability(gradeEn, gradeAr = '') {
  const text = (gradeEn + ' ' + gradeAr).toLowerCase();
  if (/rasool|comp\.\(ra\)|tab\.\(ra\)|thiq|trustworthy|ثقة/.test(text)) return 'thiqah';
  if (/saduq|truthful|صدوق/.test(text))                                   return 'saduq';
  if (/matruk|abandoned|متروك/.test(text))                                return 'matruk';
  if (/da.*if|weak|ضعيف/.test(text))                                      return 'daif';
  return 'unknown';
}

// Map grade → Generation enum value
function mapGeneration(grade) {
  const g = (grade || '').toLowerCase();
  if (/rasool|comp\.\(ra\)|companion/.test(g))              return 'sahabi';
  if (/tabi.*al.*tabi|tabi.tabi|3rd|4th generation/.test(g)) return 'tabi_tabii';
  if (/tab\.\(ra\)|tabi|2nd generation|successor/.test(g))   return 'tabii';
  return 'other';
}

// ── Load CSVs ──────────────────────────────────────────────────────────
console.log('Loading kaggle_rawis.csv …');
const kaggle = parseCsv(path.join(DATA_DIR, 'kaggle_rawis.csv'));
console.log(`  → ${kaggle.length} rows`);

console.log('Loading rawi_data.csv …');
const rawi = parseCsv(path.join(DATA_DIR, 'rawi_data.csv'));
console.log(`  → ${rawi.length} rows`);

// Build rawi lookup by first Arabic word of main name for reliability enrichment
// rawi name format: "آدم بن أبي إياس : alt names ..."
const rawiByFirstWord = new Map();
for (const r of rawi) {
  const mainName = r.name ? r.name.split(' : ')[0].trim() : '';
  const firstWord = mainName.split(/\s+/)[0];
  if (firstWord && !rawiByFirstWord.has(firstWord)) {
    rawiByFirstWord.set(firstWord, r);
  }
}

// ── Build narrators.json ───────────────────────────────────────────────
console.log('\nBuilding narrators.json …');

let withAr = 0;
let withReliability = 0;

const narrators = kaggle.map(row => {
  const id     = row['scholar_indx'];
  const nameEn = (row['name'] || '').split('(')[0].trim();
  // Cap at 4 words — hadiths use shorter forms of narrator names
  const rawAr  = extractArabicName(row['name'] || '');
  const nameAr = rawAr.split(/\s+/).slice(0, 4).join(' ');

  // Enrich reliability from rawi_data by matching first Arabic word
  const firstWord = nameAr.split(/\s+/)[0];
  const rawiRow   = firstWord ? rawiByFirstWord.get(firstWord) : null;
  const gradeAr   = rawiRow?.grade_ibn_hajar ?? '';

  const reliability = mapReliability(row['grade'] || '', gradeAr);
  const generation  = mapGeneration(row['grade'] || '');

  const birthH = parseYear(row['birth_date_hijri']);
  const deathH = parseYear(row['death_date_hijri']);

  const region = (row['birth_place'] || '').split(',')[0].trim() || null;

  if (nameAr) withAr++;
  if (reliability !== 'unknown') withReliability++;

  return {
    id,
    source_id:    id,
    name_ar:      nameAr  || '',
    name_en:      nameEn  || null,
    kunya_ar:     rawiRow?.kunyah || null,
    reliability,
    generation,
    birth_year:   birthH ?? null,
    death_year:   deathH ?? null,
    region,
  };
});

fs.writeFileSync(
  path.join(DATA_DIR, 'narrators.json'),
  JSON.stringify(narrators, null, 2)
);

console.log(`  ✓ ${narrators.length} narrators written to data/narrators.json`);
console.log(`    with name_ar    : ${withAr} (${Math.round(withAr/narrators.length*100)}%)`);
console.log(`    with reliability: ${withReliability} (${Math.round(withReliability/narrators.length*100)}%)`);

// ── Build isnad-edges.json ─────────────────────────────────────────────
console.log('\nBuilding isnad-edges.json …');

const edges = [];
for (const row of kaggle) {
  const studentId  = row['scholar_indx'];
  const teacherIds = (row['teachers_inds'] || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  for (const teacherId of teacherIds) {
    edges.push({ teacher_id: teacherId, student_id: studentId });
  }
}

fs.writeFileSync(
  path.join(DATA_DIR, 'isnad-edges.json'),
  JSON.stringify(edges, null, 2)
);
console.log(`  ✓ ${edges.length} edges written to data/isnad-edges.json`);
console.log('\n✅ Conversion complete. Run: npm run db:seed');
