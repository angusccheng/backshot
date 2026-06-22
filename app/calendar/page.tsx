import { supabase } from '@/lib/supabase';
import type { Daylist } from '@/lib/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BackButton } from '@/components/BackButton';
import CalendarView from './CalendarView';

async function getDaylists() {
  const { data, error } = await supabase
    .from('daylists')
    .select('id, title, created_at')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as Pick<Daylist, 'id' | 'title' | 'created_at'>[]) || [];
}

async function getPhotoCount() {
  const { count } = await supabase.from('photos').select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function CalendarPage() {
  const [daylists, photoCount] = await Promise.all([getDaylists(), getPhotoCount()]);

  const entryMap: Record<string, { id: string; title: string }> = {};
  for (const d of daylists) {
    const key = d.created_at.slice(0, 10);
    if (!entryMap[key]) entryMap[key] = { id: d.id, title: d.title };
  }

  const sortedKeys = Object.keys(entryMap).sort();

  // Current streak
  const today = new Date();
  let streak = 0;
  const cur = new Date(today);
  while (true) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
    if (!entryMap[k]) break;
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  // Longest streak
  let longestStreak = 0;
  let runStreak = 0;
  let prevDate: Date | null = null;
  for (const k of sortedKeys) {
    const d = new Date(k);
    if (prevDate) {
      const diff = (d.getTime() - prevDate.getTime()) / 86400000;
      if (diff === 1) { runStreak++; } else { runStreak = 1; }
    } else { runStreak = 1; }
    longestStreak = Math.max(longestStreak, runStreak);
    prevDate = d;
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav className="glass fixed top-0 left-0 right-0 z-20 px-8 h-14 flex items-center justify-center relative"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <BackButton />
        <span className="font-display font-semibold text-sm" style={{ color: 'var(--fg)' }}>Calendar</span>
        <ThemeToggle />
      </nav>
      <div className="max-w-xl mx-auto px-6 pt-8 pb-28">
        <CalendarView
          entryMap={entryMap}
          stats={{
            streak,
            longestStreak,
            totalEntries: sortedKeys.length,
            totalPhotos: photoCount,
          }}
        />
      </div>
    </main>
  );
}
