import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      // Check if any daylist was created on this date
      const { data, error } = await supabase
        .from('daylists')
        .select('id')
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lte('created_at', `${date}T23:59:59.999Z`)
        .limit(1);

      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ exists: (data?.length ?? 0) > 0 });
    }

    const { data, error } = await supabase
      .from('daylists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ daylists: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}
