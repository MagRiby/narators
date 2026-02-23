import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const listNarrators = async (req: Request, res: Response) => {
  const pageNum = Math.max(1, parseInt((req.query.page as string) ?? '1'));
  const take    = Math.min(Math.max(1, parseInt((req.query.limit as string) ?? '50')), 200);
  const skip    = (pageNum - 1) * take;
  const search  = (req.query.search as string) ?? '';

  // Without a search query only show narrators with at least 1 hadith link;
  // with a search query show all (so bio-only kaggle narrators are discoverable).
  const where: any = search
    ? { OR: [
        { name_ar: { contains: search } },
        { name_en: { contains: search, mode: 'insensitive' as const } },
      ]}
    : { hadiths: { some: {} } };

  const [narrators, total] = await Promise.all([
    prisma.narrator.findMany({
      where,
      skip,
      take,
      select: {
        id:           true,
        name_ar:      true,
        name_en:      true,
        kunya_en:     true,
        reliability:  true,
        generation:   true,
        death_year_h: true,
        _count: { select: { hadiths: true } },
      },
      orderBy: { hadiths: { _count: 'desc' } },
    }),
    prisma.narrator.count({ where }),
  ]);

  res.json({ data: narrators, total, page: pageNum, limit: take, pages: Math.ceil(total / take) });
};

export const getNarrator = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const narrator = await prisma.narrator.findUnique({
    where: { id },
    include: {
      as_teacher: {
        include: {
          student: { select: { id: true, name_ar: true, name_en: true } },
        },
        take: 30,
      },
      as_student: {
        include: {
          teacher: { select: { id: true, name_ar: true, name_en: true } },
        },
        take: 30,
      },
      _count: { select: { hadiths: true } },
    },
  });

  if (!narrator) return res.status(404).json({ error: 'Narrator not found' });
  res.json(narrator);
};

export const getNarratorBooks = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const rows = await prisma.$queryRaw<{ slug: string; name_en: string; name_ar: string; count: bigint }[]>`
    SELECT b.slug, b.name_en, b.name_ar, COUNT(DISTINCT h.id) AS count
    FROM books b
    JOIN hadiths h ON h.book_id = b.id
    JOIN hadith_narrators hn ON hn.hadith_id = h.id
    WHERE hn.narrator_id = ${id}
    GROUP BY b.id, b.slug, b.name_en, b.name_ar
    ORDER BY count DESC
  `;

  res.json(rows.map(r => ({ ...r, count: Number(r.count) })));
};

export const getNarratorHadiths = async (req: Request, res: Response) => {
  const id      = parseInt(req.params.id);
  const pageNum = Math.max(1, parseInt((req.query.page as string) ?? '1'));
  const take    = Math.min(Math.max(1, parseInt((req.query.limit as string) ?? '20')), 100);
  const skip    = (pageNum - 1) * take;
  const book    = (req.query.book as string) ?? '';

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const where: any = {
    narrators: { some: { narrator_id: id } },
    ...(book ? { book: { slug: book } } : {}),
  };

  const [hadiths, total] = await Promise.all([
    prisma.hadith.findMany({
      where,
      skip,
      take,
      include: {
        book:    { select: { slug: true, name_en: true, name_ar: true } },
        chapter: { select: { number: true, name_en: true, name_ar: true } },
        narrators: {
          orderBy: { position: 'asc' },
          include: {
            narrator: { select: { id: true, name_ar: true, name_en: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.hadith.count({ where }),
  ]);

  res.json({
    data: hadiths,
    total,
    page: pageNum,
    limit: take,
    pages: Math.ceil(total / take),
  });
};

export const getNarratorGraph = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const [self, asStudent, asTeacher] = await Promise.all([
    prisma.narrator.findUnique({
      where: { id },
      select: { id: true, name_ar: true, name_en: true, reliability: true, generation: true },
    }),
    prisma.narratorRelationship.findMany({
      where: { student_id: id },
      include: {
        teacher: {
          select: { id: true, name_ar: true, name_en: true, reliability: true },
        },
      },
    }),
    prisma.narratorRelationship.findMany({
      where: { teacher_id: id },
      include: {
        student: {
          select: { id: true, name_ar: true, name_en: true, reliability: true },
        },
      },
    }),
  ]);

  if (!self) return res.status(404).json({ error: 'Narrator not found' });

  const nodesMap = new Map<number, object>();
  const edges: { source: number; target: number }[] = [];

  nodesMap.set(id, { ...self, role: 'center' });

  for (const r of asStudent) {
    nodesMap.set(r.teacher_id, { ...r.teacher, role: 'teacher' });
    edges.push({ source: r.teacher_id, target: id });
  }
  for (const r of asTeacher) {
    nodesMap.set(r.student_id, { ...r.student, role: 'student' });
    edges.push({ source: id, target: r.student_id });
  }

  res.json({ nodes: Array.from(nodesMap.values()), edges });
};
