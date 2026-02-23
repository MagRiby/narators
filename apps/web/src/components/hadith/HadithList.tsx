import HadithCard, { HadithData } from './HadithCard';

interface Props {
  hadiths: HadithData[];
  highlightQuery?: string;
}

export default function HadithList({ hadiths, highlightQuery }: Props) {
  if (!hadiths.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No hadiths found.</p>
      </div>
    );
  }

  return (
    <div>
      {hadiths.map((h) => (
        <HadithCard key={h.id} hadith={h} highlightQuery={highlightQuery} />
      ))}
    </div>
  );
}
