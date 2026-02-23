'use client';

const BOOKS = [
  { slug: 'bukhari',  label: 'Sahih al-Bukhari' },
  { slug: 'muslim',   label: 'Sahih Muslim' },
  { slug: 'abudawud', label: 'Sunan Abi Dawud' },
  { slug: 'tirmidhi', label: 'Jami at-Tirmidhi' },
  { slug: 'nasai',    label: "Sunan an-Nasa'i" },
  { slug: 'ibnmajah', label: 'Sunan Ibn Majah' },
  { slug: 'malik',    label: 'Muwatta Malik' },
];

const GRADES = [
  { value: 'sahih',  label: 'Sahih' },
  { value: 'hasan',  label: 'Hasan' },
  { value: 'daif',   label: "Da'if" },
];

interface Props {
  book: string;
  grade: string;
  onBookChange: (v: string) => void;
  onGradeChange: (v: string) => void;
}

export default function SearchFilters({ book, grade, onBookChange, onGradeChange }: Props) {
  const selectClass = `
    px-3 py-2 rounded-lg text-sm
    border border-gray-200 dark:border-gray-700
    bg-white dark:bg-gray-900
    text-gray-700 dark:text-gray-300
    focus:outline-none focus:border-emerald-500
    transition-colors
  `;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select value={book} onChange={(e) => onBookChange(e.target.value)} className={selectClass}>
        <option value="">All Books</option>
        {BOOKS.map((b) => (
          <option key={b.slug} value={b.slug}>{b.label}</option>
        ))}
      </select>

      <select value={grade} onChange={(e) => onGradeChange(e.target.value)} className={selectClass}>
        <option value="">All Grades</option>
        {GRADES.map((g) => (
          <option key={g.value} value={g.value}>{g.label}</option>
        ))}
      </select>
    </div>
  );
}
