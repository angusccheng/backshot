import { supabase } from '@/lib/supabase';
import type { Daylist, Photo, JournalEntry } from '@/lib/types';
import DaylistClient from './DaylistClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getDaylist(id: string) {
  const { data: daylist, error } = await supabase
    .from('daylists')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !daylist) return null;

  const typedDaylist = daylist as Daylist;
  const matchedPhotoIds = typedDaylist.matched_photos.map((mp) => mp.photoId);

  const entryResult = typedDaylist.entry_id
    ? await supabase.from('journal_entries').select('*').eq('id', typedDaylist.entry_id).single()
    : { data: null };

  const entry = entryResult.data as JournalEntry | null;
  const uploadedPhotoIds = entry?.photo_ids ?? [];
  const allPhotoIds = [...new Set([...matchedPhotoIds, ...uploadedPhotoIds])];

  const photosResult = allPhotoIds.length > 0
    ? await supabase.from('photos').select('id, storage_path, fingerprint, created_at').in('id', allPhotoIds)
    : { data: [] };

  const allPhotos = (photosResult.data as Photo[]) || [];
  const photoMap = new Map(allPhotos.map(p => [p.id, p]));

  const matchedPhotos = matchedPhotoIds.map(id => photoMap.get(id)).filter(Boolean) as Photo[];
  const uploadedPhotos = uploadedPhotoIds.map(id => photoMap.get(id)).filter(Boolean) as Photo[];

  return { daylist: typedDaylist, photos: matchedPhotos, uploadedPhotos, entry };
}

export default async function DaylistPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getDaylist(id);

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-xl font-display mb-4" style={{ color: 'var(--fg)' }}>Entry not found.</p>
          <a href="/shelf" className="text-sm underline opacity-70 hover:opacity-100" style={{ color: 'var(--fg-secondary)' }}>
            Back to shelf
          </a>
        </div>
      </main>
    );
  }

  return <DaylistClient {...result} />;
}
