import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getHadith = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  const hadith = await prisma.hadith.findUnique({
    where: { id },
    include: {
      book: { select: { slug: true, name_ar: true, name_en: true } },
      chapter: { select: { number: true, name_ar: true, name_en: true } },
      narrators: {
        orderBy: { position: 'asc' },
        include: {
          narrator: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              kunya_ar: true,
              kunya_en: true,
              reliability: true,
            },
          },
        },
      },
    },
  });

  if (!hadith) return res.status(404).json({ error: 'Hadith not found' });
  res.json(hadith);
};
