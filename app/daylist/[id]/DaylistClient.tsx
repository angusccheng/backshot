'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { Daylist, Photo, JournalEntry } from '@/lib/types';
import { BackButton } from '@/components/BackButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PhotoCropModal, getCropPosition } from '@/components/PhotoCropModal';

const HTMLFlipBook = dynamic(() => import('react-pageflip'), { ssr: false }) as any;

interface Props {
  daylist: Daylist;
  photos: Photo[];
  uploadedPhotos: Photo[];
  entry: JournalEntry | null;
}

const LINE_HEIGHT = 28;
const PAGE_W = 380;
const PAGE_H = 540;
// Available text height per page: PAGE_H - top padding (32 + LINE_HEIGHT) - bottom padding (32)
const CHARS_PER_PAGE = 680;

type PageDef =
  | { kind: 'entry'; html: string }
  | { kind: 'ai-photo'; photo?: Photo }
  | { kind: 'blank' };

// ── HTML text splitter ────────────────────────────────────────────────────
function splitHtmlIntoPages(raw: string): string[] {
  if (!raw || !raw.trim()) return [''];

  const isHtml = /<[a-z][\s\S]*>/i.test(raw);

  if (!isHtml) {
    // Plain text — split by double newlines (paragraphs)
    const paras = raw.split(/\n\n+/);
    const pages: string[] = [];
    let page = '';
    let len = 0;
    for (const p of paras) {
      if (len > 0 && len + p.length > CHARS_PER_PAGE) {
        pages.push(page);
        page = p;
        len = p.length;
      } else {
        page += (page ? '\n\n' : '') + p;
        len += p.length;
      }
    }
    if (page) pages.push(page);
    return pages.length ? pages : [raw];
  }

  // HTML — split at top-level block boundaries
  // Match <div>, <p>, <blockquote> blocks or lone <br> tags
  const blockRe = /(<(?:div|p|blockquote)[^>]*>[\s\S]*?<\/(?:div|p|blockquote)>|<br\s*\/?>)/gi;
  const parts: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(raw)) !== null) {
    if (m.index > lastIndex) parts.push(raw.slice(lastIndex, m.index));
    parts.push(m[0]);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < raw.length) parts.push(raw.slice(lastIndex));

  const pages: string[] = [];
  let page = '';
  let len = 0;
  for (const part of parts) {
    const textLen = part.replace(/<[^>]*>/g, '').trim().length;
    if (len > 0 && len + textLen > CHARS_PER_PAGE) {
      if (page.trim()) pages.push(page);
      page = part;
      len = textLen || 5;
    } else {
      page += part;
      len += textLen || 5;
    }
  }
  if (page.trim()) pages.push(page);
  return pages.length ? pages : [raw];
}

// ── Tape ─────────────────────────────────────────────────────────────────
function tapeHash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

// Corners: tape goes diagonally across each corner of the polaroid frame
type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];

function CornerTape({ corner, wobble }: { corner: Corner; wobble: number }) {
  const base: React.CSSProperties = {
    position: 'absolute', width: 38, height: 15,
    background: 'rgba(215,208,168,0.62)', borderRadius: 2, zIndex: 10,
    boxShadow: 'inset 0 0 0 1px rgba(180,170,120,0.28)',
  };
  const w = wobble; // small extra rotation ±6°
  if (corner === 'tl') return <div style={{ ...base, top: -4, left: -4, transform: `rotate(${-45 + w}deg)` }} />;
  if (corner === 'tr') return <div style={{ ...base, top: -4, right: -4, transform: `rotate(${45 + w}deg)` }} />;
  if (corner === 'bl') return <div style={{ ...base, bottom: -4, left: -4, transform: `rotate(${45 + w}deg)` }} />;
                       return <div style={{ ...base, bottom: -4, right: -4, transform: `rotate(${-45 + w}deg)` }} />;
}

function TapeStrips({ id }: { id: string }) {
  const h = tapeHash(id);
  // Pick 1–3 corners to tape (never all 4 — too uniform)
  const count = 1 + (h % 3);
  const used = new Set<Corner>();
  const strips: { corner: Corner; wobble: number }[] = [];

  for (let i = 0; i < 8 && strips.length < count; i++) {
    const corner = CORNERS[(h >> (i * 4)) % 4];
    if (used.has(corner)) continue;
    used.add(corner);
    const wobble = ((h >> (i * 3 + 2)) % 13) - 6;
    strips.push({ corner, wobble });
  }

  return <>{strips.map((s, i) => <CornerTape key={i} {...s} />)}</>;
}

// ── Polaroid ─────────────────────────────────────────────────────────────
function PolaroidPhoto({ photo, index, onCropClick, size = 168 }: { photo: Photo; index: number; onCropClick: () => void; size?: number }) {
  const [cropPos, setCropPos] = useState('50% 50%');
  const rot = ((index % 5) - 2) * 1.6;
  useEffect(() => { setCropPos(getCropPosition(photo.id)); }, [photo.id]);
  return (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: 18 }}>
      <TapeStrips id={photo.id} />
      <div
        style={{ background: '#fff', padding: '8px 8px 0 8px', boxShadow: '0 6px 24px rgba(0,0,0,0.15)', transform: `rotate(${rot}deg)`, display: 'inline-block', cursor: 'pointer', borderRadius: 3 }}
        onClick={e => { e.stopPropagation(); onCropClick(); }}
      >
        <div style={{ width: size, height: size, overflow: 'hidden', background: '#ddd' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.storage_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: cropPos }} draggable={false} />
        </div>
        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}

// ── Lined paper ──────────────────────────────────────────────────────────
const linedStyle: React.CSSProperties = {
  backgroundColor: '#fafaf8',
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${LINE_HEIGHT - 1}px, rgba(100,120,200,0.10) ${LINE_HEIGHT - 1}px, rgba(100,120,200,0.10) ${LINE_HEIGHT}px)`,
  backgroundSize: `100% ${LINE_HEIGHT}px`,
};

// ── Page ─────────────────────────────────────────────────────────────────
const Page = ({ page, onCropClick }: { page: PageDef; onCropClick?: (photo: Photo) => void }) => {
  void onCropClick;
  const base: React.CSSProperties = {
    width: '100%', height: '100%', overflow: 'hidden',
    position: 'relative', boxSizing: 'border-box',
    backgroundColor: '#fafaf8',
  };

  if (page.kind === 'blank') return <div style={{ ...base, ...linedStyle }} />;

  if (page.kind === 'entry') {
    const isHtml = /<[a-z][\s\S]*>/i.test(page.html);
    return (
      <div style={{ ...base, ...linedStyle }}>
        <div style={{ padding: `${LINE_HEIGHT}px 28px`, height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
          {page.html ? (
            isHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: page.html }}
                style={{
                  fontSize: 13.5, lineHeight: `${LINE_HEIGHT}px`, color: '#2a2a2a',
                  fontFamily: 'Georgia, serif',
                }}
              />
            ) : (
              <p style={{ fontSize: 13.5, lineHeight: `${LINE_HEIGHT}px`, color: '#2a2a2a', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
                {page.html}
              </p>
            )
          ) : (
            <p style={{ fontSize: 13, lineHeight: `${LINE_HEIGHT}px`, color: '#bbb', fontStyle: 'italic' }}>No entry written.</p>
          )}
        </div>
        {/* Inline styles for rich content */}
        <style>{`
          .entry-page b, .entry-page strong { font-weight: bold; }
          .entry-page i, .entry-page em { font-style: italic; }
          .entry-page u { text-decoration: underline; }
          .entry-page s { text-decoration: line-through; }
          .entry-page blockquote { border-left: 3px solid rgba(100,120,200,0.25); padding-left: 12px; color: #666; margin: 0; }
        `}</style>
      </div>
    );
  }

  if (page.kind === 'ai-photo') {
    const h = page.photo ? tapeHash(page.photo.id) : 0;
    const rot = ((h % 21) - 10) * 1.2; // -12 to +12 deg
    const nudgeX = ((h >> 3) % 41) - 20; // -20 to +20px
    const nudgeY = ((h >> 6) % 31) - 15; // -15 to +15px
    return (
      <div style={{ ...base, ...linedStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {page.photo?.storage_path ? (
          <div style={{ position: 'relative', display: 'inline-block', marginTop: nudgeY, marginLeft: nudgeX }}>
            <TapeStrips id={page.photo.id} />
            <div style={{ background: '#fff', padding: '10px 10px 0 10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', transform: `rotate(${rot}deg)`, display: 'inline-block', borderRadius: 3 }}>
              <div style={{ width: 240, height: 240, overflow: 'hidden', background: '#ddd' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.photo.storage_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
              </div>
              <div style={{ height: 40 }} />
            </div>
          </div>
        ) : (
          <div style={{ color: '#ccc', fontSize: 40 }}>◈</div>
        )}
      </div>
    );
  }

  return null;
};

// ── Hold-to-delete ─────────────────────────────────────────────────────────
function HoldTrashButton({ onDelete, deleting }: { onDelete: () => void; deleting: boolean }) {
  const controls = useAnimation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startHold = useCallback(() => {
    if (deleting) return;
    controls.set({ width: '0%' });
    controls.start({ width: '100%', transition: { duration: 1.5, ease: 'linear' } });
    timerRef.current = setTimeout(() => onDelete(), 1500);
  }, [controls, deleting, onDelete]);
  const cancelHold = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    controls.start({ width: '0%', transition: { duration: 0.15 } });
  }, [controls]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return (
    <button onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
      onTouchStart={startHold} onTouchEnd={cancelHold} onTouchCancel={cancelHold}
      disabled={deleting}
      className="relative w-8 h-8 rounded-md flex items-center justify-center disabled:opacity-30 transition-opacity hover:opacity-60"
      style={{ color: 'var(--fg)' }}>
      <motion.div initial={{ width: '0%' }} animate={controls} className="absolute left-0 top-0 h-full rounded-md" style={{ background: 'rgba(128,128,128,0.2)' }} />
      <Trash2 size={13} className="relative z-10" />
    </button>
  );
}

// ── Editable title ────────────────────────────────────────────────────────
function EditableTitle({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const save = async (v: string) => {
    const trimmed = v.trim() || initial;
    setValue(trimmed); setEditing(false);
    if (trimmed !== initial)
      await fetch(`/api/daylists/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: trimmed }) });
  };
  return editing
    ? <input value={value} onChange={e => setValue(e.target.value)} onBlur={() => save(value)}
        onKeyDown={e => { if (e.key === 'Enter') save(value); if (e.key === 'Escape') { setValue(initial); setEditing(false); } }}
        className="font-display text-sm font-medium italic text-center bg-transparent border-none outline-none"
        style={{ color: 'var(--fg)', letterSpacing: '-0.01em', minWidth: 120, maxWidth: 280 }} autoFocus />
    : <button onClick={() => setEditing(true)} className="font-display text-sm font-medium italic transition-opacity hover:opacity-60"
        style={{ color: 'var(--fg)', letterSpacing: '-0.01em' }}>{value}</button>;
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DaylistClient({ daylist, photos, uploadedPhotos, entry }: Props) {
  const router = useRouter();
  const bookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cropPhoto, setCropPhoto] = useState<Photo | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const photoMap = new Map(photos.map(p => [p.id, p]));

  // Build page list
  const pageDefs: PageDef[] = [];

  if (entry) {
    // Split entry text/HTML into multiple pages
    const chunks = splitHtmlIntoPages(entry.text ?? '');
    chunks.forEach(html => pageDefs.push({ kind: 'entry', html }));
  }

  // AI-matched photos only (no captions) — each gets its own page
  daylist.matched_photos.forEach(mp => {
    pageDefs.push({ kind: 'ai-photo', photo: photoMap.get(mp.photoId) });
  });

  if (pageDefs.length % 2 !== 0) pageDefs.push({ kind: 'blank' });

  const totalPages = pageDefs.length;
  const totalSpreads = Math.ceil(totalPages / 2);
  const spreadIdx = Math.floor(currentPage / 2);

  const handleDelete = async () => {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/daylists/${daylist.id}`, { method: 'DELETE' });
    router.push('/shelf');
  };

  const formattedDate = new Date(daylist.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-20 px-8 h-14 flex items-center justify-center relative"
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <BackButton />
        <div className="flex flex-col items-center">
          <p className="text-xs" style={{ color: 'var(--fg-tertiary)' }}>{formattedDate}</p>
          <EditableTitle id={daylist.id} initial={daylist.title} />
        </div>
        <div className="absolute right-8 flex items-center gap-2">
          <HoldTrashButton onDelete={handleDelete} deleting={deleting} />
          <ThemeToggle className="!relative !right-auto" />
        </div>
      </nav>

      {/* Book */}
      <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-24">
        <div style={{
          boxShadow: '0 32px 80px rgba(0,0,0,0.30)',
          background: '#fafaf8',
          position: 'relative',
          zIndex: 10,
        }}>
          {mounted && (
            <HTMLFlipBook
              ref={bookRef}
              width={PAGE_W}
              height={PAGE_H}
              size="fixed"
              minWidth={PAGE_W}
              maxWidth={PAGE_W}
              minHeight={PAGE_H}
              maxHeight={PAGE_H}
              drawShadow={true}
              maxShadowOpacity={0.18}
              flippingTime={500}
              usePortrait={false}
              startPage={0}
              autoSize={false}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={50}
              showPageCorners={true}
              disableFlipByClick={false}
              onFlip={(e: any) => setCurrentPage(e.data)}
              style={{ background: '#fafaf8' }}
            >
              {pageDefs.map((page, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <div key={i} style={{ width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
                    <Page page={page} onCropClick={setCropPhoto} />
                    <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(0,0,0,0.12)', pointerEvents: 'none' }} />
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0,
                      [isLeft ? 'right' : 'left']: 0,
                      width: 1,
                      background: 'rgba(0,0,0,0.1)',
                      pointerEvents: 'none',
                    }} />
                  </div>
                );
              })}
            </HTMLFlipBook>
          )}
        </div>

        {/* Progress dots */}
        {totalSpreads > 1 && (
          <div className="flex gap-2 items-center mt-5">
            {Array.from({ length: totalSpreads }).map((_, i) => (
              <button key={i}
                onClick={() => bookRef.current?.pageFlip()?.flip(i * 2)}
                className="rounded-full transition-all duration-200"
                style={{ width: i === spreadIdx ? 18 : 5, height: 5, background: i === spreadIdx ? 'var(--fg)' : 'var(--fg-secondary)', opacity: i === spreadIdx ? 1 : 0.5 }} />
            ))}
          </div>
        )}
      </div>

      {/* Crop modal */}
      <AnimatePresence>
        {cropPhoto && (
          <PhotoCropModal
            key={cropPhoto.id}
            photoId={cropPhoto.id}
            src={cropPhoto.storage_path}
            onClose={() => setCropPhoto(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
