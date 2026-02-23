'use client';

import { useState, useRef } from 'react';
import NarratorPopover from '../narrator/NarratorPopover';

export interface AttachedNarrator {
  id: number;
  name_ar: string;
  name_en?: string;
}

interface Props {
  narrator: AttachedNarrator;
  children: React.ReactNode;
}

export default function NarratorSpan({ narrator, children }: Props) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const timeoutRef            = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    clearTimeout(timeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: rect.left,
      y: rect.bottom + 6,
    });
    setOpen(true);
  };

  const handleMouseLeave = () => {
    // Delay close so user can move cursor into the popover
    timeoutRef.current = setTimeout(() => setOpen(false), 180);
  };

  return (
    <>
      <span
        className="
          text-emerald-700 dark:text-emerald-400
          underline decoration-dotted decoration-emerald-400
          cursor-pointer hover:text-emerald-900 dark:hover:text-emerald-300
          transition-colors
        "
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>

      {open && (
        <NarratorPopover
          narratorId={narrator.id}
          position={pos}
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={() => setOpen(false)}
        />
      )}
    </>
  );
}
