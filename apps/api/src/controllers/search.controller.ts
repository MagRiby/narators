import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const search = async (req: Request, res: Response) => {
  const {
    q        = '',
    book     = '',
    grade    = '',
    narrator = '',
    page     = '1',
    limit    = '20',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const take    = Math.min(Math.max(1, parseInt(limit)), 100);
  const skip    = (pageNum - 1) * take;

  const query = q.trim();

  // ── Structured WHERE (non-FTS filters) ──────────────────────
  const where: Prisma.HadithWhereInput = {};
  if (book)     where.book     = { slug: book };
  if (grade)    where.grade    = grade as never;
  if (narrator) where.narrators = { some: { narrator_id: parseInt(narrator) } };

  // ── Text search via ILIKE ────────────────────────────────────
  if (query) {
    where.OR = [
      { text_ar: { contains: query, mode: 'insensitive' } },
      { text_en: { contains: query, mode: 'insensitive' } },
    ];

    const [hadiths, total] = await Promise.all([
      prisma.hadith.findMany({
        where,
        skip,
        take,
        include: {
          book:    { select: { slug: true, name_en: true, name_ar: true } },
          chapter: { select: { number: true, name_en: true } },
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

    return res.json({ data: hadiths, total, page: pageNum, limit: take, pages: Math.ceil(total / take) });
  }

  // ── Structured filter only (no text query) ───────────────────
  const [hadiths, total] = await Promise.all([
    prisma.hadith.findMany({
      where,
      skip,
      take,
      include: {
        book:    { select: { slug: true, name_en: true, name_ar: true } },
        chapter: { select: { number: true, name_en: true } },
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

  res.json({ data: hadiths, total, page: pageNum, limit: take, pages: Math.ceil(total / take) });
};
