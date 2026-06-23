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
    const body = await request.json() as { entryText: string; entryHtml?: string; pageHtml?: string[]; photoIds: string[] };
    const { entryText, entryHtml, pageHtml, photoIds } = body;

    if (!entryText) {
      return Response.json({ error: 'entryText is required' }, { status: 400 });
    }

    // Collect photo IDs used in recent daylists (last 10) to avoid repeats
    const { data: recentDaylists } = await supabase
      .from('daylists')
      .select('matched_photos')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentlyUsedIds = new Set<string>(photoIds); // also exclude user-uploaded
    (recentDaylists ?? []).forEach((d: { matched_photos: Array<{ photoId: string }> }) => {
      (d.matched_photos ?? []).forEach((mp: { photoId: string }) => recentlyUsedIds.add(mp.photoId));
    });

    const excludeList = Array.from(recentlyUsedIds);

    // Fetch all stored photo fingerprints for matching
    const { data: allPhotos } = await supabase
      .from('photos')
      .select('id, fingerprint')
      .not('id', 'in', `(${excludeList.length ? excludeList.map(id => `"${id}"`).join(',') : '""'})`)
      .order('created_at', { ascending: false })
      .limit(50);

    const photosForMatching = (allPhotos as Pick<Photo, 'id' | 'fingerprint'>[]) || [];

    const fingerprintSummary = photosForMatching.map(p => ({
      photoId: p.id,
      fingerprint: p.fingerprint,
    }));

    const prompt = `You are a deeply empathetic archivist who connects personal memories to photographs. You read journal entries carefully and find the hidden emotional threads — the specific feelings, images, and moments a person describes — then match those to photos that carry the same emotional truth.

Journal entry:
"${entryText}"

Available photos and their emotional fingerprints:
${JSON.stringify(fingerprintSummary, null, 2)}

Your task:
1. Read the journal entry closely. Identify the specific emotions, images, sensory details, and underlying feelings the writer is experiencing — not just the surface topics, but what they are really feeling underneath.
2. Match 3-5 photos whose mood, emotion, and atmosphere genuinely echo what the writer expressed. Prioritize emotional resonance over literal subject matter — a photo of an empty street can match a feeling of loneliness even if the entry never mentions streets.
3. For each matched photo, write:
   - "reason": one or two sentences explaining the emotional or thematic bridge between this photo and the entry — what feeling, atmosphere, or undercurrent they share. Do not quote the entry. Write as if you're an archivist explaining your choice to the writer: what you saw in both, why they belong together.
   - "caption": a single poetic fragment (not a full sentence) written in the writer's voice — something they could have jotted in the margin of their journal. It should feel like it came from the same emotional place as the entry, not like a description of the photo.
4. Write a short lowercase title (3-7 words) that captures the emotional core of the entry — something the writer would recognize as true about their day.

Return only a JSON object:
{
  "title": "lowercase evocative title here",
  "matchedPhotos": [
    {
      "photoId": "the photo's id from the list",
      "reason": "specific sentence connecting entry to this photo",
      "caption": "poetic fragment in the writer's voice"
    }
  ]
}

Only return JSON, nothing else. If no photos are available, return an empty matchedPhotos array.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1800,
    });

    const text = stripMarkdownFences(response.choices[0].message.content ?? '');
    const daylistResult = JSON.parse(text) as DaylistResult;

    // GPT sometimes corrupts UUIDs or repeats — filter and deduplicate
    const validIds = new Set(photosForMatching.map(p => p.id));
    const seenInResponse = new Set<string>();
    daylistResult.matchedPhotos = daylistResult.matchedPhotos.filter(mp => {
      if (!validIds.has(mp.photoId) || seenInResponse.has(mp.photoId)) return false;
      seenInResponse.add(mp.photoId);
      return true;
    });

    // Save journal entry
    const entryId = crypto.randomUUID();
    const { error: entryError } = await supabase.from('journal_entries').insert({
      id: entryId,
      text: entryHtml ?? entryText,
      page_html: pageHtml ?? null,
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
