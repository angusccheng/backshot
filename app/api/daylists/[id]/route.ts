import { createClient } from '@supabase/supabase-js';
import type { Daylist, Photo } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: daylist, error } = await supabase
      .from('daylists')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !daylist) {
      return Response.json({ error: 'Daylist not found' }, { status: 404 });
    }

    const typedDaylist = daylist as Daylist;
    const photoIds = typedDaylist.matched_photos.map(mp => mp.photoId);

    let photos: Photo[] = [];
    if (photoIds.length > 0) {
      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .in('id', photoIds);
      photos = (photosData as Photo[]) || [];
    }

    return Response.json({ daylist: typedDaylist, photos });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title } = body;
    const { error } = await supabase.from('daylists').update({ title }).eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get entry_id before deleting
    const { data: daylist } = await supabase
      .from('daylists')
      .select('entry_id')
      .eq('id', id)
      .single();

    await supabase.from('daylists').delete().eq('id', id);

    if (daylist?.entry_id) {
      await supabase.from('journal_entries').delete().eq('id', daylist.entry_id);
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}
