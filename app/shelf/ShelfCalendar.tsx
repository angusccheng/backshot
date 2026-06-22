'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';

interface Props {
  entryMap: Record<string, { id: string; title: string }>;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function computeStreak(entryMap: Record<string, unknown>): number {
  const today = new Date();
  let streak = 0;
  const date = new Date(today);
  while (true) {
    const key = toKey(date.getFullYear(), date.getMonth(), date.getDate());
    if (!entryMap[key]) break;
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

// Flow-hover fill button (circular, for chevrons)
function FlowIconButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [origin, setOrigin] = useState({ x: 18, y: 18 });
  const [coverSize, setCoverSize] = useState(0);

  const fromPointer = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const d = Math.ceil(2 * Math.max(Math.hypot(x, y), Math.hypot(36 - x, y), Math.hypot(x, 36 - y), Math.hypot(36 - x, 36 - y)));
    setOrigin({ x, y });
    setCoverSize(d);
  }, []);

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      onPointerEnter={(e) => { fromPointer(e); setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(e) => fromPointer(e)}
      className="relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-colors"
      style={{
        background: 'var(--bg-alt)',
        border: '1px solid var(--border)',
        color: hovered ? 'var(--bg)' : 'var(--fg)',
      }}
    >
      <motion.span
        aria-hidden
        animate={{ scale: hovered && coverSize > 0 ? 1 : 0 }}
        initial={false}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute rounded-full bg-[var(--fg)] -translate-x-1/2 -translate-y-1/2"
        style={{ width: coverSize, height: coverSize, left: origin.x, top: origin.y }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export default function ShelfCalendar({ entryMap }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const streak = computeStreak(entryMap);
  const totalEntries = Object.keys(entryMap).length;

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Streak + stats */}
      {totalEntries > 0 && (
        <div className="flex items-center justify-center gap-8 mb-10">
          <div className="text-center">
            <p className="font-display text-3xl font-semibold" style={{ color: 'var(--fg)', letterSpacing: '-0.03em' }}>
              {streak}
            </p>
            <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>
              day streak 🔥
            </p>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
          <div className="text-center">
            <p className="font-display text-3xl font-semibold" style={{ color: 'var(--fg)', letterSpacing: '-0.03em' }}>
              {totalEntries}
            </p>
            <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>
              total entries
            </p>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-8">
        <FlowIconButton onClick={prevMonth}>
          <ChevronLeft size={16} />
        </FlowIconButton>

        <div className="text-center">
          <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            {MONTHS[month]}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>{year}</p>
        </div>

        <FlowIconButton onClick={nextMonth}>
          <ChevronRight size={16} />
        </FlowIconButton>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center py-2">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--fg-tertiary)' }}>
              {d}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const key = toKey(year, month, day);
          const entry = entryMap[key];
          const isToday = key === todayKey;

          const inner = (
            <div
              className="relative aspect-square flex items-center justify-center rounded-xl"
              style={{
                background: entry ? 'var(--fg)' : isToday ? 'var(--bg-alt)' : 'transparent',
                border: isToday && !entry ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              <span
                className="text-sm font-medium font-display"
                style={{
                  color: entry ? 'var(--bg)' : isToday ? 'var(--fg)' : 'var(--fg-secondary)',
                  letterSpacing: '-0.01em',
                }}
              >
                {day}
              </span>
            </div>
          );

          if (entry) {
            return (
              <Link
                key={key}
                href={`/daylist/${entry.id}`}
                className="block transition-transform hover:scale-105"
                title={entry.title}
              >
                {inner}
              </Link>
            );
          }

          return <div key={key}>{inner}</div>;
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-8 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--fg)' }} />
          <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Has entry</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Today</span>
        </div>
      </div>

      {totalEntries === 0 && (
        <div className="text-center mt-16">
          <p className="font-display text-2xl font-light mb-3" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            No entries yet.
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--fg-secondary)' }}>Write your first entry to fill the calendar.</p>
          <Link
            href="/write"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-display font-medium text-base"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            Write today&apos;s entry
          </Link>
        </div>
      )}
    </div>
  );
}
