'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Photo } from '@/lib/types';
import { BackButton } from '@/components/BackButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Trash2, X, Crop, Upload, Maximize2, Check, Pencil } from 'lucide-react';
import { PhotoCropModal, getCropPosition } from '@/components/PhotoCropModal';
import { DateSearch } from '@/components/DateSearch';
import { OriginButton } from '@/components/ui/origin-button';
import { GooeyLoader } from '@/components/ui/loader-10';

const HOLD_DURATION = 1500;

// Upload button that opens file picker directly with OriginButton flood-fill effect
function OriginUploadButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <OriginButton
        aria-label="Upload photos"
        onClick={() => inputRef.current?.click()}
        className="h-9 w-9 rounded-[10px] px-0"
        style={{ background: 'var(--bg-alt)', color: 'var(--fg-secondary)' }}
      >
        <Upload size={15} />
      </OriginButton>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { onFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
    </>
  );
}

interface ImportPhoto {
  id: string;
  base64: string;
  preview: string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

function getTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return ((hash % 400) / 100) - 2;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function HoldTrashButton({ onDelete, deleting }: { onDelete: () => void; deleting: boolean }) {
  const controls = useAnimation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback(() => {
    if (deleting) return;
    controls.set({ width: '0%' });
    controls.start({ width: '100%', transition: { duration: HOLD_DURATION / 1000, ease: 'linear' } });
    timerRef.current = setTimeout(() => { onDelete(); }, HOLD_DURATION);
  }, [controls, deleting, onDelete]);

  const cancelHold = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    controls.start({ width: '0%', transition: { duration: 0.15 } });
  }, [controls]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button
      onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
      onTouchStart={startHold} onTouchEnd={cancelHold} onTouchCancel={cancelHold}
      disabled={deleting}
      onClick={e => e.stopPropagation()}
      className="relative w-8 h-8 rounded-md overflow-hidden flex items-center justify-center disabled:opacity-30"
      style={{ background: 'var(--bg-alt)', color: 'var(--fg)' }}
      aria-label="Hold to delete"
    >
      <motion.div initial={{ width: '0%' }} animate={controls}
        className="absolute left-0 top-0 h-full"
        style={{ background: 'var(--fg)', opacity: 0.15 }}
      />
      <Trash2 size={12} className="relative z-10" />
    </button>
  );
}

function ImportPopup({ onImported }: { onImported: () => void }) {
  const [importPhotos, setImportPhotos] = useState<ImportPhoto[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const newPhotos: ImportPhoto[] = await Promise.all(
      imageFiles.map(async (file) => ({
        id: crypto.randomUUID(),
        base64: await fileToBase64(file),
        preview: URL.createObjectURL(file),
        name: file.name,
        status: 'pending' as const,
      }))
    );
    setImportPhotos(prev => [...prev, ...newPhotos]);
    setDone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleImport = async () => {
    const pending = importPhotos.filter(p => p.status === 'pending');
    if (!pending.length) return;
    setImporting(true);
    for (let i = 0; i < pending.length; i += 3) {
      const batch = pending.slice(i, i + 3);
      setImportPhotos(prev => prev.map(p => batch.find(b => b.id === p.id) ? { ...p, status: 'uploading' } : p));
      try {
        const res = await fetch('/api/analyze-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: batch.map(p => ({ base64: p.base64, photoId: p.id })) }),
        });
        if (!res.ok) throw new Error('Upload failed');
        setImportPhotos(prev => prev.map(p => batch.find(b => b.id === p.id) ? { ...p, status: 'done' } : p));
      } catch {
        setImportPhotos(prev => prev.map(p => batch.find(b => b.id === p.id) ? { ...p, status: 'error' } : p));
      }
    }
    setImporting(false);
    setDone(true);
    onImported();
  };

  const pendingCount = importPhotos.filter(p => p.status === 'pending').length;
  const doneCount = importPhotos.filter(p => p.status === 'done').length;

  return (
    <div style={{ width: 280 }}>
      <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--fg-secondary)' }}>Import photos</p>

      {done ? (
        <div className="text-center py-2">
          <p className="font-display text-base font-medium mb-3" style={{ color: 'var(--fg)' }}>
            {doneCount} photo{doneCount !== 1 ? 's' : ''} added
          </p>
          <button
            onClick={() => { setImportPhotos([]); setDone(false); }}
            className="text-xs transition-opacity hover:opacity-60"
            style={{ color: 'var(--fg-secondary)' }}
          >
            Import more
          </button>
        </div>
      ) : (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl text-center cursor-pointer transition-all mb-3 py-5"
            style={{ border: '1.5px dashed var(--fg-tertiary)', background: 'var(--bg-alt)' }}
          >
            <Upload size={16} className="mx-auto mb-1.5" style={{ color: 'var(--fg-secondary)' }} />
            <p className="text-xs" style={{ color: 'var(--fg-secondary)' }}>Drop or <span className="underline">browse</span></p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
            />
          </div>

          {/* Preview grid */}
          {importPhotos.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {importPhotos.map(photo => (
                <div key={photo.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.preview}
                    alt={photo.name}
                    className="w-full aspect-square object-cover rounded-lg"
                    style={{ opacity: photo.status === 'uploading' ? 0.5 : 1 }}
                  />
                  {photo.status === 'uploading' && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {photo.status === 'done' && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#34C759' }}>
                      <Check size={9} color="white" />
                    </div>
                  )}
                  {photo.status === 'error' && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#FF3B30', fontSize: 9 }}>!</div>
                  )}
                  {!importing && photo.status === 'pending' && (
                    <button
                      onClick={() => setImportPhotos(prev => prev.filter(p => p.id !== photo.id))}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--fg)', fontSize: 10 }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {importPhotos.length > 0 && (
            <div>
              {importing && <GooeyLoader className="mb-2" />}
            <button
              onClick={handleImport}
              disabled={importing || pendingCount === 0}
              className="w-full py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
              style={{ background: 'var(--fg)', color: 'var(--bg)' }}
            >
              {importing
                ? `Analyzing ${pendingCount}…`
                : `Add ${pendingCount} photo${pendingCount !== 1 ? 's' : ''}`}
            </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [admireMode, setAdmireMode] = useState(false);
  const [admireHovered, setAdmireHovered] = useState(false);
  const [cropping, setCropping] = useState<Photo | null>(null);
  const [cropVersions, setCropVersions] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<{ month: string; day: string; year: string }>({ month: '', day: '', year: '' });
  const [editing, setEditing] = useState<Photo | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCaption, setEditCaption] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editTagInput, setEditTagInput] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const editMoRef = useRef<HTMLInputElement>(null);
  const editDyRef = useRef<HTMLInputElement>(null);
  const editYrRef = useRef<HTMLInputElement>(null);
  const editTagInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load photos.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploading(true);
    const toBase64 = (file: File): Promise<string> =>
      new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
    for (let i = 0; i < imageFiles.length; i += 3) {
      const batch = imageFiles.slice(i, i + 3);
      const photos = await Promise.all(batch.map(async f => ({ base64: await toBase64(f), photoId: crypto.randomUUID() })));
      await fetch('/api/analyze-photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photos }) });
    }
    setUploading(false);
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    setSelected(null);
    try {
      const res = await fetch(`/api/photos?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch { setError('Could not delete photo.'); }
    finally { setDeletingId(null); }
  }, []);

  const filteredPhotos = photos.filter(p => {
    const d = new Date(p.created_at);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    const yr = String(d.getFullYear());
    if (filter.year && !yr.startsWith(filter.year)) return false;
    if (filter.month && !mo.startsWith(filter.month.padStart(2, '0'))) return false;
    if (filter.day && !dy.startsWith(filter.day.padStart(2, '0'))) return false;
    return true;
  });

  const hasFilter = filter.month || filter.day || filter.year;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)', transition: 'background 0.3s' }}>
      <nav className="glass fixed top-0 left-0 right-0 z-20 px-8 h-14 flex items-center justify-center relative" style={{ borderBottom: '1px solid var(--border)' }}>
        <BackButton />
        <span className="font-display font-semibold text-sm" style={{ color: 'var(--fg)' }}>Photos</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        {error && (
          <div className="rounded-lg px-5 py-3 text-sm mb-6" style={{ background: 'var(--bg-alt)', color: 'var(--fg)' }}>
            {error} — <button onClick={fetchPhotos} className="underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <GooeyLoader />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <p className="font-display text-3xl font-light mb-3" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>No photos yet.</p>
            <p className="text-base mb-10" style={{ color: 'var(--fg-secondary)' }}>Import photos so the AI has memories to draw from.</p>
            <button
              onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}
              className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-display font-medium text-base"
              style={{ background: 'var(--fg)', color: 'var(--bg)' }}
            >
              Import photos
            </button>
          </div>
        ) : (
          <>
            {/* Toolbar: search left, import right */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <DateSearch onChange={setFilter} />
                {hasFilter && (
                  <span className="text-xs" style={{ color: 'var(--fg-secondary)' }}>
                    {filteredPhotos.length} of {photos.length}
                  </span>
                )}
              </div>

              {/* Upload button + loading indicator */}
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {uploading && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs font-display"
                      style={{ color: 'var(--fg-secondary)' }}
                    >
                      Uploading…
                    </motion.span>
                  )}
                </AnimatePresence>
                <OriginUploadButton onFiles={uploadFiles} />
              </div>
            </div>

            {filteredPhotos.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>No photos match that date.</p>
            ) : (
              <div className="flex flex-wrap gap-6 justify-start">
                {filteredPhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    onClick={() => { setSelected(photo); setAdmireMode(false); }}
                    className="cursor-pointer flex-shrink-0 relative"
                    style={{ rotate: getTilt(photo.id), opacity: deletingId === photo.id ? 0.3 : 1, paddingTop: 10 }}
                    whileHover={{ scale: 1.07, rotate: 0, zIndex: 10, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Tack pin */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: 2 }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
                      }} />
                      <div style={{ width: 2, height: 6, background: 'rgba(0,0,0,0.25)', margin: '0 auto', borderRadius: '0 0 2px 2px' }} />
                    </div>

                    <div className="select-none" style={{ width: 160, background: '#fff', padding: '8px 8px 0 8px', boxShadow: '0 6px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)', borderRadius: 3 }}>
                      <div style={{ width: 144, height: 144, overflow: 'hidden', background: '#ddd' }}>
                        {photo.storage_path
                          ? <img src={photo.storage_path} alt="" className="w-full h-full object-cover" draggable={false} style={{ objectPosition: getCropPosition(photo.id) }} />
                          : <div className="w-full h-full flex items-center justify-center"><span style={{ color: '#bbb', fontSize: 32 }}>◈</span></div>
                        }
                      </div>
                      <div style={{ height: 32 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Enlarged overlay */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.72, rotate: getTilt(selected.id) * 3, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.72, rotate: getTilt(selected.id) * 3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 300, background: '#fff', padding: '12px 12px 0 12px', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', borderRadius: 3 }}
            >
              <div
                style={{ height: 280, overflow: 'hidden', background: '#eee', position: 'relative' }}
                onMouseEnter={() => setAdmireHovered(true)}
                onMouseLeave={() => setAdmireHovered(false)}
              >
                {selected.storage_path && <img src={selected.storage_path} alt="" className="w-full h-full object-cover" style={{ objectPosition: getCropPosition(selected.id) }} />}
                <div
                  onMouseEnter={() => setAdmireHovered(true)}
                  onMouseLeave={() => setAdmireHovered(false)}
                  style={{ position: 'absolute', top: 0, right: 0, width: 48, height: 48 }}
                >
                  <AnimatePresence>
                    {admireHovered && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setAdmireMode(v => !v)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md"
                        style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
                      >
                        <Maximize2 size={12} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {!admireMode ? (
                  <motion.div
                    key="info"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ padding: '12px 4px 16px' }}>
                      <p style={{ fontSize: 10, color: 'var(--fg-secondary)', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {formatDate(selected.created_at)}
                      </p>
                      {selected.fingerprint && (
                        <>
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            <span className="text-xs px-2.5 py-0.5 font-semibold" style={{ background: 'var(--fg)', color: 'var(--bg)', fontSize: 11 }}>
                              {selected.fingerprint.mood}
                            </span>
                            {selected.fingerprint.emotions.slice(0, 3).map(e => (
                              <span key={e} className="text-xs px-2.5 py-0.5" style={{ background: 'var(--border)', color: 'var(--fg-secondary)', fontSize: 11 }}>
                                {e}
                              </span>
                            ))}
                          </div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--fg)' }}>{selected.fingerprint.caption}</p>
                        </>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => setSelected(null)}
                          className="group flex items-center gap-1 transition-opacity hover:opacity-60 outline-none"
                          style={{ color: 'var(--fg-secondary)' }}>
                          <X size={11} />
                          <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[3rem]"
                            style={{ fontSize: 11 }}>Close</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const d = new Date(selected.created_at);
                              setEditMonth(String(d.getMonth() + 1).padStart(2, '0'));
                              setEditDay(String(d.getDate()).padStart(2, '0'));
                              setEditYear(String(d.getFullYear()));
                              const tags = [selected.fingerprint?.mood, ...(selected.fingerprint?.emotions ?? [])].filter(Boolean) as string[];
                              setEditTags(tags);
                              setEditCaption(selected.fingerprint?.caption ?? '');
                              setEditTagInput('');
                              setEditing(selected);
                              setSelected(null);
                            }}
                            className="w-8 h-8 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ background: 'var(--bg-alt)', color: 'var(--fg)' }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => { setCropping(selected); setSelected(null); }}
                            className="w-8 h-8 rounded-md flex items-center justify-center transition-opacity hover:opacity-70"
                            style={{ background: 'var(--bg-alt)', color: 'var(--fg)' }}
                          >
                            <Crop size={12} />
                          </button>
                          <HoldTrashButton onDelete={() => handleDelete(selected.id)} deleting={deletingId === selected.id} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="admire"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ height: 48 }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}
            onClick={() => { setSelected(editing); setEditing(null); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 320, background: 'var(--bg)', borderRadius: 12, padding: 20, boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--fg-secondary)' }}>Edit photo</p>

              <div className="flex flex-col gap-4">
                {/* Date — same style as DateSearch */}
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg-secondary)' }}>Date</label>
                  <div className="flex items-center gap-1 px-3 rounded-[10px]" style={{ border: '1px solid var(--border)', background: 'var(--bg-alt)', height: 34 }}>
                    <input ref={editMoRef} type="text" placeholder="MM" maxLength={2} value={editMonth}
                      onChange={e => { const v = e.target.value.replace(/\D/g,''); setEditMonth(v); if (v.length === 2) { editDyRef.current?.focus(); editDyRef.current?.select(); } }}
                      onKeyDown={e => { if (e.key==='ArrowRight') { e.preventDefault(); editDyRef.current?.focus(); } }}
                      className="tabular-nums border-none outline-none bg-transparent w-8 text-center"
                      style={{ fontSize: 13, color: 'var(--fg)' }} />
                    <span style={{ color: 'var(--fg-secondary)', fontSize: 13 }}>/</span>
                    <input ref={editDyRef} type="text" placeholder="DD" maxLength={2} value={editDay}
                      onChange={e => { const v = e.target.value.replace(/\D/g,''); setEditDay(v); if (v.length === 2) { editYrRef.current?.focus(); editYrRef.current?.select(); } }}
                      onKeyDown={e => { if (e.key==='ArrowRight') { e.preventDefault(); editYrRef.current?.focus(); } if (e.key==='ArrowLeft') { e.preventDefault(); editMoRef.current?.focus(); } if (e.key==='Backspace' && e.currentTarget.value==='') { e.preventDefault(); editMoRef.current?.focus(); } }}
                      className="tabular-nums border-none outline-none bg-transparent w-8 text-center"
                      style={{ fontSize: 13, color: 'var(--fg)' }} />
                    <span style={{ color: 'var(--fg-secondary)', fontSize: 13 }}>/</span>
                    <input ref={editYrRef} type="text" placeholder="YYYY" maxLength={4} value={editYear}
                      onChange={e => setEditYear(e.target.value.replace(/\D/g,''))}
                      onKeyDown={e => { if (e.key==='ArrowLeft') { e.preventDefault(); editDyRef.current?.focus(); } if (e.key==='Backspace' && e.currentTarget.value==='') { e.preventDefault(); editDyRef.current?.focus(); } }}
                      className="tabular-nums border-none outline-none bg-transparent w-12 text-center"
                      style={{ fontSize: 13, color: 'var(--fg)' }} />
                  </div>
                </div>

                {/* Tags — mood (black, first) + emotions (gray) */}
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg-secondary)' }}>
                    Words <span style={{ fontWeight: 400 }}>— first tag is mood (black), rest are emotions (gray)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-[10px] min-h-[38px]" style={{ border: '1px solid var(--border)', background: 'var(--bg-alt)' }}>
                    {editTags.map((tag, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: i === 0 ? 'var(--fg)' : 'var(--border)', color: i === 0 ? 'var(--bg)' : 'var(--fg-secondary)', fontSize: 11 }}>
                        {tag}
                        <button onClick={() => setEditTags(prev => prev.filter((_, j) => j !== i))}
                          className="hover:opacity-60 transition-opacity" style={{ lineHeight: 1 }}>
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={editTagInputRef}
                      type="text"
                      placeholder="Add tag…"
                      value={editTagInput}
                      onChange={e => setEditTagInput(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === ',') && editTagInput.trim()) {
                          e.preventDefault();
                          setEditTags(prev => [...prev, editTagInput.trim()]);
                          setEditTagInput('');
                        }
                        if (e.key === 'Backspace' && editTagInput === '' && editTags.length > 0) {
                          setEditTags(prev => prev.slice(0, -1));
                        }
                      }}
                      className="border-none outline-none bg-transparent flex-1 min-w-[80px]"
                      style={{ fontSize: 11, color: 'var(--fg)' }}
                    />
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--fg-secondary)' }}>Caption</label>
                  <textarea
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    rows={3}
                    className="w-full rounded-[10px] px-3 py-2 text-xs resize-none outline-none"
                    style={{ background: 'var(--bg-alt)', color: 'var(--fg)', border: '1px solid var(--border)', lineHeight: 1.6 }}
                  />
                </div>
              </div>

              {/* Save / Cancel — BackButton style */}
              <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                {/* Cancel — goes back to photo card */}
                <button onClick={() => { setSelected(editing); setEditing(null); }}
                  className="group flex items-center gap-1 transition-opacity hover:opacity-60 outline-none"
                  style={{ color: 'var(--fg-secondary)' }}>
                  <X size={11} />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[4rem]"
                    style={{ fontSize: 11 }}>Cancel</span>
                </button>
                {/* Save */}
                <button
                  onClick={async () => {
                    if (!editing) return;
                    setEditSaving(true);
                    const [mood, ...emotions] = editTags;
                    const updatedFingerprint = { ...editing.fingerprint, mood: mood ?? '', emotions, caption: editCaption };
                    const created_at = editMonth && editDay && editYear
                      ? new Date(parseInt(editYear), parseInt(editMonth) - 1, parseInt(editDay), 12, 0, 0).toISOString()
                      : editing.created_at;
                    await fetch('/api/photos', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: editing.id, fingerprint: updatedFingerprint, created_at }),
                    });
                    const updated = { ...editing, fingerprint: updatedFingerprint, created_at };
                    setPhotos(prev => prev.map(p => p.id === editing.id ? updated : p));
                    setEditSaving(false);
                    setEditing(null);
                    setSelected(updated);
                  }}
                  disabled={editSaving}
                  className="group flex items-center gap-1 transition-opacity hover:opacity-60 outline-none"
                  style={{ color: 'var(--fg-secondary)' }}>
                  <Check size={11} />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[3rem]"
                    style={{ fontSize: 11 }}>{editSaving ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crop modal */}
      <AnimatePresence>
        {cropping && (
          <PhotoCropModal
            key={cropping.id}
            photoId={cropping.id}
            src={cropping.storage_path}
            onClose={() => setCropping(null)}
            onCancel={() => { setSelected(cropping); setCropping(null); }}
            onSave={() => { setCropVersions(v => ({ ...v, [cropping.id]: (v[cropping.id] ?? 0) + 1 })); setSelected(cropping); setCropping(null); }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
