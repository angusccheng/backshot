import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('id, storage_path, fingerprint, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Photos fetch error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ photos: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, fingerprint, created_at } = await request.json();
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (fingerprint !== undefined) updates.fingerprint = fingerprint;
    if (created_at !== undefined) updates.created_at = created_at;

    const { error } = await supabase.from('photos').update(updates).eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}
