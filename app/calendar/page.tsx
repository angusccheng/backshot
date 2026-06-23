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
          daylists={daylists}
          totalPhotos={photoCount}
        />
      </div>
    </main>
  );
}
