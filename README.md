# backshot

a personal journaling app where you write one entry a day and AI matches it to photos from your library — not based on what's literally in the image, but on shared emotion, atmosphere, and feeling.

## what it does

- **write** — a daily prompt greets you each morning. rich text editor with formatting, font size, color, and highlights. one entry per day.
- **AI photo matching** — after submitting, GPT-4o analyzes your entry's emotional fingerprint and selects photos from your library that share the same undercurrent. each match comes with a reason (an archivist's note on why) and a poetic caption written in your voice.
- **daylist** — your entry and matched photos are presented as a flippable book. photos are polaroids you can hover to flip and read the AI's reasoning on the back.
- **photo library** — upload and manage your photos. edit metadata, crop, filter by date.
- **calendar** — browse all past entries by date. streaks, stats, search.
- **magnifier** — a glass lens overlay for day mode. flashlight for night mode.

## stack

- **Next.js 15** (App Router)
- **Supabase** — database + photo storage
- **OpenAI** gpt-4o-mini — emotional photo matching
- **Framer Motion** — animations
- **Tailwind CSS**

## env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

## run locally

```bash
npm install
npm run dev
```
