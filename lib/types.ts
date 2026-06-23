export interface EmotionalFingerprint {
  mood: string;
  emotions: string[];
  colors: string[];
  themes: string[];
  caption: string;
}

export interface Photo {
  id: string;
  storage_path: string; // public URL from Supabase Storage
  fingerprint: EmotionalFingerprint;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  photo_ids: string[];
  page_html: string[] | null;
  created_at: string;
}

export interface Daylist {
  id: string;
  title: string;
  entry_id: string;
  matched_photos: Array<{ photoId: string; reason: string; caption: string }>;
  created_at: string;
}
