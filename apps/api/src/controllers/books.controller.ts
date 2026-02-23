import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const listBooks = async (_req: Request, res: Response) => {
  const books = await prisma.book.findMany({
    select: {
      id: true,
      slug: true,
      name_ar: true,
      name_en: true,
      author_en: true,
      hadith_count: true,
    },
    orderBy: { name_en: 'asc' },
  });
  res.json(books);
};

export const getBook = async (req: Request, res: Response) => {
  const book = await prisma.book.findUnique({
    where: { slug: req.params.slug },
    include: {
      chapters: {
        orderBy: { number: 'asc' },
        select: {
          id: true,
          number: true,
          name_ar: true,
          name_en: true,
          hadith_count: true,
        },
      },
    },
  });
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
};

export const getChapters = async (req: Request, res: Response) => {
  const book = await prisma.book.findUnique({
    where: { slug: req.params.slug },
    select: { id: true },
  });
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const chapters = await prisma.chapter.findMany({
    where: { book_id: book.id },
    orderBy: { number: 'asc' },
  });
  res.json(chapters);
};

export const getHadiths = async (req: Request, res: Response) => {
  const { page = '1', limit = '20', chapter, grade } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const take    = Math.min(Math.max(1, parseInt(limit)), 100);
  const skip    = (pageNum - 1) * take;

  const book = await prisma.book.findUnique({
    where: { slug: req.params.slug },
    select: { id: true },
  });
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const where: Record<string, unknown> = { book_id: book.id };
  if (chapter) where.chapter_id = parseInt(chapter);
  if (grade)   where.grade = grade;

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
            narrator: {
              select: { id: true, name_ar: true, name_en: true, kunya_en: true },
            },
          },
        },
      },
      orderBy: { number: 'asc' },
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
