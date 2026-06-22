import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { EmotionalFingerprint } from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

async function analyzePhoto(base64: string): Promise<EmotionalFingerprint> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          {
            type: 'text',
            text: `Analyze this photo and return a JSON object with exactly these fields:
{
  "mood": "one word describing the overall mood",
  "emotions": ["array", "of", "2-4", "emotions"],
  "colors": ["array", "of", "2-3", "dominant", "colors"],
  "themes": ["array", "of", "2-4", "visual", "themes"],
  "caption": "a single evocative sentence describing the photo's emotional essence"
}
Only return the JSON, nothing else.`,
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const text = stripMarkdownFences(response.choices[0].message.content ?? '');
  return JSON.parse(text) as EmotionalFingerprint;
}

async function uploadToStorage(base64: string, photoId: string): Promise<string> {
  // Convert base64 to binary
  const buffer = Buffer.from(base64, 'base64');
  const path = `${photoId}.jpg`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      photos: Array<{ base64: string; photoId: string }>;
    };

    if (!body.photos || !Array.isArray(body.photos)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const fingerprints: Array<{ photoId: string; fingerprint: EmotionalFingerprint }> = [];

    for (const { base64, photoId } of body.photos) {
      const [fingerprint, publicUrl] = await Promise.all([
        analyzePhoto(base64),
        uploadToStorage(base64, photoId),
      ]);

      const { error } = await supabase.from('photos').insert({
        id: photoId,
        storage_path: publicUrl,
        fingerprint,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Supabase insert error:', error);
        return Response.json({ error: 'Failed to save photo' }, { status: 500 });
      }

      fingerprints.push({ photoId, fingerprint });
    }

    return Response.json({ fingerprints });
  } catch (err) {
    console.error('analyze-photos error:', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    return Response.json({ error: message }, { status: 500 });
  }
}
