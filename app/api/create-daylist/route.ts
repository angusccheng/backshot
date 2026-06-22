import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { Photo } from '@/lib/types';

interface DaylistResult {
  title: string;
  matchedPhotos: Array<{ photoId: string; reason: string; caption: string }>;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { entryText: string; entryHtml?: string; photoIds: string[] };
    const { entryText, entryHtml, photoIds } = body;

    if (!entryText) {
      return Response.json({ error: 'entryText is required' }, { status: 400 });
    }

    // Fetch all stored photo fingerprints for matching
    const { data: allPhotos } = await supabase
      .from('photos')
      .select('id, fingerprint')
      .not('id', 'in', `(${photoIds.length ? photoIds.map(id => `"${id}"`).join(',') : '""'})`)
      .order('created_at', { ascending: false })
      .limit(50);

    const photosForMatching = (allPhotos as Pick<Photo, 'id' | 'fingerprint'>[]) || [];

    const fingerprintSummary = photosForMatching.map(p => ({
      photoId: p.id,
      fingerprint: p.fingerprint,
    }));

    const prompt = `You are a music curator creating a Spotify Daylist.

Journal entry: "${entryText}"

Available photos and their emotional fingerprints:
${JSON.stringify(fingerprintSummary, null, 2)}

Match 1-3 photos from the list that resonate with the journal entry's mood and themes. Then craft a short evocative lowercase title (3-7 words, like "late afternoon golden hour drift").

Return a JSON object with exactly:
{
  "title": "lowercase evocative title here",
  "matchedPhotos": [
    {
      "photoId": "the photo's id from the list",
      "reason": "one sentence why this photo matches the entry",
      "caption": "a poetic caption for this photo in this moment"
    }
  ]
}

Only return JSON, nothing else. If no photos are available, return an empty matchedPhotos array.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });

    const text = stripMarkdownFences(response.choices[0].message.content ?? '');
    const daylistResult = JSON.parse(text) as DaylistResult;

    // GPT sometimes corrupts UUIDs — filter to only real photo IDs
    const validIds = new Set(photosForMatching.map(p => p.id));
    daylistResult.matchedPhotos = daylistResult.matchedPhotos.filter(mp => validIds.has(mp.photoId));

    // Save journal entry
    const entryId = crypto.randomUUID();
    const { error: entryError } = await supabase.from('journal_entries').insert({
      id: entryId,
      text: entryHtml ?? entryText,
      photo_ids: photoIds,
      created_at: new Date().toISOString(),
    });

    if (entryError) {
      console.error('Entry insert error:', entryError);
      return Response.json({ error: 'Failed to save journal entry' }, { status: 500 });
    }

    // Save daylist
    const daylistId = crypto.randomUUID();
    const { error: daylistError } = await supabase.from('daylists').insert({
      id: daylistId,
      title: daylistResult.title,
      entry_id: entryId,
      matched_photos: daylistResult.matchedPhotos,
      created_at: new Date().toISOString(),
    });

    if (daylistError) {
      console.error('Daylist insert error:', daylistError);
      return Response.json({ error: 'Failed to save daylist' }, { status: 500 });
    }

    return Response.json({ daylistId });
  } catch (err) {
    console.error('create-daylist error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}
