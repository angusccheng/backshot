-- Run this SQL in the Supabase SQL editor to create the required tables

-- Photos table
create table if not exists photos (
  id text primary key,
  storage_path text default '',
  base64_data text,
  fingerprint jsonb,
  created_at timestamptz default now()
);

-- Journal entries table
create table if not exists journal_entries (
  id text primary key,
  text text not null,
  photo_ids text[] default '{}',
  created_at timestamptz default now()
);

-- Daylists table
create table if not exists daylists (
  id text primary key,
  title text not null,
  entry_id text references journal_entries(id),
  matched_photos jsonb default '[]',
  created_at timestamptz default now()
);
