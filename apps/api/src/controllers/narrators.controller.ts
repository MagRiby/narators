import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const listNarrators = async (req: Request, res: Response) => {
  const pageNum = Math.max(1, parseInt((req.query.page as string) ?? '1'));
  const take    = Math.min(Math.max(1, parseInt((req.query.limit as string) ?? '50')), 200);
  const skip    = (pageNum - 1) * take;
  const search  = (req.query.search as string) ?? '';

  const where = search
    ? { OR: [
        { name_ar: { contains: search } },
        { name_en: { contains: search, mode: 'insensitive' as const } },
      ]}
    : {};

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

export const getNarratorHadiths = async (req: Request, res: Response) => {
  const id      = parseInt(req.params.id);
  const pageNum = Math.max(1, parseInt((req.query.page as string) ?? '1'));
  const take    = Math.min(Math.max(1, parseInt((req.query.limit as string) ?? '20')), 100);
  const skip    = (pageNum - 1) * take;

  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const where = { narrators: { some: { narrator_id: id } } };

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
