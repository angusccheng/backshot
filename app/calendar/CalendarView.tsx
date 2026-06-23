'use client';

import { useState } from 'react';
import { OriginButton } from '@/components/ui/origin-button';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BarChart2, Flame, BookOpen, Image, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateSearch } from '@/components/DateSearch';

interface Stats {
  streak: number;
  longestStreak: number;
  totalEntries: number;
  totalPhotos: number;
}

interface Daylist { id: string; title: string; created_at: string; }

interface Props {
  daylists: Daylist[];
  totalPhotos: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarView({ daylists, totalPhotos }: Props) {
  const today = new Date();

  // Build entryMap client-side so dates use local timezone
  const entryMap: Record<string, { id: string; title: string }> = {};
  for (const d of daylists) {
    const local = new Date(d.created_at);
    const key = toKey(local.getFullYear(), local.getMonth(), local.getDate());
    if (!entryMap[key]) entryMap[key] = { id: d.id, title: d.title };
  }

  const sortedKeys = Object.keys(entryMap).sort();

  // Current streak
  let streak = 0;
  const cur = new Date(today);
  while (true) {
    const k = toKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
    if (!entryMap[k]) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  // Longest streak — compare consecutive local-date keys
  let longestStreak = 0;
  let runStreak = 0;
  let prevKey: string | null = null;
  for (const k of sortedKeys) {
    if (prevKey) {
      const prev = new Date(prevKey + 'T12:00:00');
      const curr = new Date(k + 'T12:00:00');
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) { runStreak++; } else { runStreak = 1; }
    } else { runStreak = 1; }
    longestStreak = Math.max(longestStreak, runStreak);
    prevKey = k;
  }

  const stats: Stats = { streak, longestStreak, totalEntries: sortedKeys.length, totalPhotos };
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [statsOpen, setStatsOpen] = useState(false);
  const [filter, setFilter] = useState<{ month: string; day: string; year: string }>({ month: '', day: '', year: '' });
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const handleFilterChange = (f: { month: string; day: string; year: string }) => {
    setFilter(f);
    if (f.year && f.year.length === 4) {
      const y = parseInt(f.year);
      if (y >= 2000 && y <= 2100) setYear(y);
    }
    if (f.month && f.month.length <= 2) {
      const m = parseInt(f.month) - 1;
      if (m >= 0 && m <= 11) setMonth(m);
    }
  };

  const hasFilter = filter.month || filter.day || filter.year;

  const matchesFilter = (key: string) => {
    if (!hasFilter) return false;
    // key is already "YYYY-MM-DD" in local time — parse directly, no Date constructor
    const [yr, mo, dy] = key.split('-');
    if (filter.year && !yr.startsWith(filter.year)) return false;
    if (filter.month && mo !== filter.month.padStart(2, '0')) return false;
    if (filter.day && dy !== filter.day.padStart(2, '0')) return false;
    return true;
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1);

  return (
    <div>
      {/* Top toolbar: search left, legend center (absolute), stats right */}
      <div className="relative flex items-center justify-between mb-4">
        <DateSearch onChange={handleFilterChange} />

        {/* Legend — truly centered, unaffected by search width */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--fg)' }} />
            <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Entry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ outline: '2px solid #C8936A', outlineOffset: '1px' }} />
            <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Today</span>
          </div>
        </div>

        {/* Stats button — right */}
        <div className="relative" onMouseEnter={() => setStatsOpen(true)} onMouseLeave={() => setStatsOpen(false)}>
          <OriginButton
            aria-label="Stats"
            className="h-9 w-9 rounded-[10px] px-0"
            style={{ background: 'var(--bg-alt)', color: 'var(--fg-secondary)' }}
          >
            <BarChart2 size={15} />
          </OriginButton>

          <AnimatePresence>
            {statsOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.94 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute right-0 top-11 z-20 rounded-2xl p-4"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
                    width: 220,
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--fg-tertiary)' }}>Your stats</p>
                  <div className="flex flex-col gap-3">
                    <StatRow icon={<Flame size={14} style={{ color: '#C8936A' }} />} label="Current streak" value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`} />
                    <StatRow icon={<Trophy size={14} style={{ color: '#C8936A' }} />} label="Longest streak" value={`${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`} />
                    <div style={{ height: 1, background: 'var(--border)' }} />
                    <StatRow icon={<BookOpen size={14} style={{ color: 'var(--fg-secondary)' }} />} label="Total entries" value={String(stats.totalEntries)} />
                    <StatRow icon={<Image size={14} style={{ color: 'var(--fg-secondary)' }} />} label="Total photos" value={String(stats.totalPhotos)} />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-40"
          style={{ color: 'var(--fg)' }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h2 className="font-display font-semibold text-xl" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>{MONTHS[month]}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>{year}</p>
        </div>
        <button onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-40"
          style={{ color: 'var(--fg)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center py-2">
            <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--fg-tertiary)' }}>{d}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const key = toKey(year, month, day);
          const entry = entryMap[key];
          const isToday = key === todayKey;
          const isHighlighted = matchesFilter(key);

          const cell = (
            <motion.div
              whileHover={entry ? { scale: 1.08 } : {}}
              className="relative aspect-square flex items-center justify-center rounded-xl"
              style={{
                background: entry
                  ? isHighlighted ? '#C8936A' : 'var(--fg)'
                  : isHighlighted ? 'rgba(200,147,106,0.12)' : 'transparent',
                outline: isToday ? '2px solid #C8936A' : 'none',
                outlineOffset: isToday ? '2px' : 0,
                border: !isToday ? '1px solid transparent' : 'none',
                cursor: entry ? 'pointer' : 'default',
              }}>
              <span className="text-sm font-medium font-display" style={{
                color: entry ? 'var(--bg)' : isToday ? '#C8936A' : 'var(--fg-secondary)',
                fontWeight: isToday ? 700 : undefined,
                letterSpacing: '-0.01em',
              }}>
                {day}
              </span>
            </motion.div>
          );

          return entry
            ? <Link key={key} href={`/daylist/${entry.id}`}>{cell}</Link>
            : <div key={key}>{cell}</div>;
        })}
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{label}</span>
      </div>
      <span className="font-display font-semibold text-sm" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>{value}</span>
    </div>
  );
}
