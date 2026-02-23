const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function stripDiacritics(str) {
  return str.replace(/[\u064B-\u065F\u0670]/g, '');
}

async function main() {
  // Check if these narrator names exist in the DB at all
  const testNames = ['عبد الله بن نمير', 'إسماعيل', 'قيس', 'أبو بكر'];
  console.log('=== Narrator name lookup ===');
  for (const name of testNames) {
    const n = await prisma.narrator.findFirst({ where: { name_ar: name }, select: { id: true, name_ar: true, name_en: true } });
    console.log(`"${name}" → ${n ? `FOUND id=${n.id} en="${n.name_en}"` : 'NOT FOUND'}`);
  }

  // Check the Ahmad hadith ID
  const hadith = await prisma.hadith.findFirst({
    where: { book: { slug: 'ahmad' } },
    orderBy: { number_in_book: 'asc' },
    select: { id: true, text_ar: true }
  });
  console.log('\n=== Ahmad hadith #1 ===');
  console.log('DB id:', hadith.id);

  // Check stripped text vs narrator names
  const stripped = stripDiacritics(hadith.text_ar);
  console.log('stripped (first 150):', stripped.substring(0, 150));

  for (const name of testNames) {
    console.log(`includes("${name}"):`, stripped.includes(name));
  }

  // Check how many total hadith-narrator links exist for this hadith
  const links = await prisma.hadithNarrator.count({ where: { hadith_id: hadith.id } });
  console.log('\nLinks for this hadith:', links);

  // Check a narrator that should match — does it exist with exact spelling?
  const similar = await prisma.narrator.findMany({
    where: { name_ar: { startsWith: 'عبد الله' } },
    select: { id: true, name_ar: true, name_en: true },
    take: 5
  });
  console.log('\nNarrators starting with "عبد الله":');
  similar.forEach(n => console.log(` [${n.id}] "${n.name_ar}" / "${n.name_en}"`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
