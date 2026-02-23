'use client';

import { useState, FormEvent } from 'react';

interface Props {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? 'Search in Arabic or English… e.g. الصلاة'}
        dir="auto"
        className="
          flex-1 px-4 py-2.5 rounded-xl
          border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-900
          text-gray-900 dark:text-gray-100
          placeholder:text-gray-400
          focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
          transition-colors
        "
      />
      <button
        type="submit"
        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
      >
        Search
      </button>
    </form>
  );
}
