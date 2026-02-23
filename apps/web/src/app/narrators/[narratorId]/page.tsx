import type { Metadata } from 'next';
import NarratorProfile from '@/components/narrator/NarratorProfile';

interface Props {
  params: { narratorId: string };
}

async function getNarrator(id: string) {
  const res = await fetch(`${process.env.API_URL}/api/narrators/${id}`, {
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error('Narrator not found');
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const narrator = await getNarrator(params.narratorId);
  return { title: narrator.name_en ?? narrator.name_ar };
}

export default async function NarratorPage({ params }: Props) {
  const narrator = await getNarrator(params.narratorId);
  return <NarratorProfile narrator={narrator} />;
}
