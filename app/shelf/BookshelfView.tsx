'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { DateSearch } from '@/components/DateSearch';

interface Entry { id: string; title: string; created_at: string; }
interface Props { entries: Entry[]; }

// --- Palette & Sizes ---
const PALETTE = [
  { bg: '#FFB3B3', text: '#5C1A1A', label: 'Rose' },
  { bg: '#FFCBA4', text: '#5C2E0A', label: 'Peach' },
  { bg: '#FFF0A0', text: '#4A3A00', label: 'Butter' },
  { bg: '#B8F0B8', text: '#0A3A0A', label: 'Mint' },
  { bg: '#A8E6F0', text: '#0A2A3A', label: 'Sky' },
  { bg: '#B0C8FF', text: '#0A1A5C', label: 'Periwinkle' },
  { bg: '#D4B0FF', text: '#2A0A5C', label: 'Lavender' },
  { bg: '#FFB0D8', text: '#5C0A2E', label: 'Pink' },
  { bg: '#C8F0D8', text: '#0A3A20', label: 'Sage' },
  { bg: '#FFD8A8', text: '#5C2A00', label: 'Apricot' },
  { bg: '#D0F0FF', text: '#0A2A4A', label: 'Ice' },
  { bg: '#F0D0FF', text: '#3A0A5C', label: 'Lilac' },
];

// All sizes share the same width — only height differs, fixed (no variance)
const SPINE_WIDTH = 54;
const SIZES = [
  { label: 'S', height: 148 },
  { label: 'M', height: 192 },
  { label: 'L', height: 240 },
];

function hashNum(id: string, mult: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * mult + id.charCodeAt(i)) >>> 0;
  return h;
}
const hashColorIdx = (id: string) => hashNum(id, 31) % PALETTE.length;

function formatSpineDate(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = String(d.getDate()).padStart(2, '0');
  return {
    line1: `${month} ${day}`,
    line2: String(d.getFullYear()),
  };
}

const STORAGE_KEY = 'diary-book-prefs';
interface BookPrefs { colorIdx?: number; sizeIdx?: number; }
function loadPrefs(): Record<string, BookPrefs> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function savePrefs(map: Record<string, BookPrefs>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

const ITEMS_PER_SHELF = 7;

// --- Color + Size Picker ---
function BookPicker({ colorIdx, sizeIdx, onColor, onSize, onClose, anchorRect }: {
  colorIdx: number; sizeIdx: number;
  onColor: (i: number) => void; onSize: (i: number) => void; onClose: () => void;
  anchorRect: DOMRect;
}) {
  const W = 172;
  const left = Math.max(8, anchorRect.left + anchorRect.width / 2 - W / 2);
  const top = anchorRect.top - 8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.94 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="z-50 rounded-xl"
      style={{
        position: 'fixed', left, top,
        transform: 'translateY(-100%)',
        background: 'var(--bg)', border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', width: W,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="p-3">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-tertiary)' }}>Color</p>
      <div className="grid grid-cols-6 gap-1 mb-3">
        {PALETTE.map((c, i) => (
          <button key={i} onClick={() => onColor(i)}
            className="w-6 h-6 rounded-sm flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: c.bg }} title={c.label}>
            {colorIdx === i && <Check size={10} style={{ color: c.text }} />}
          </button>
        ))}
      </div>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--fg-tertiary)' }}>Size</p>
      <div className="flex gap-1.5">
        {SIZES.map((s, i) => (
          <button key={s.label} onClick={() => onSize(i)}
            className="flex-1 rounded-md text-xs font-display font-medium py-1 transition-all"
            style={{
              background: sizeIdx === i ? 'var(--fg)' : 'var(--bg-alt)',
              color: sizeIdx === i ? 'var(--bg)' : 'var(--fg-secondary)',
              border: '1px solid var(--border)',
            }}>
            {s.label}
          </button>
        ))}
      </div>
      </div>
    </motion.div>
  );
}

export default function BookshelfView({ entries }: Props) {
  const [prefs, setPrefs] = useState<Record<string, BookPrefs>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);
  const [pickerColorIdx, setPickerColorIdx] = useState(0);
  const [pickerSizeIdx, setPickerSizeIdx] = useState(1);
  const [filter, setFilter] = useState<{ month: string; day: string; year: string }>({ month: '', day: '', year: '' });

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  const updatePref = useCallback((id: string, patch: BookPrefs) => {
    setPrefs(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch } };
      savePrefs(next);
      return next;
    });
  }, []);

  // Filter as you type — partial match on any combination of fields
  const filtered = entries.filter(e => {
    const d = new Date(e.created_at);
    const yr = String(d.getFullYear());
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    if (filter.year && !yr.startsWith(filter.year)) return false;
    if (filter.month && !mo.startsWith(filter.month.padStart(2, '0'))) return false;
    if (filter.day && !dy.startsWith(filter.day.padStart(2, '0'))) return false;
    return true;
  });

  const shelves: Entry[][] = [];
  for (let i = 0; i < filtered.length; i += ITEMS_PER_SHELF) {
    shelves.push(filtered.slice(i, i + ITEMS_PER_SHELF));
  }

  const hasFilter = filter.month || filter.day || filter.year;

  return (
    <div>
      <div className="mb-10">
        <DateSearch onChange={setFilter} />
        {hasFilter && (
          <p className="text-xs mt-2" style={{ color: 'var(--fg-tertiary)' }}>
            {filtered.length} of {entries.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="font-display text-2xl font-light mb-3" style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}>Your shelf is empty.</p>
          <p className="text-sm mb-8" style={{ color: 'var(--fg-secondary)' }}>Write your first entry to get started.</p>
          <Link href="/write" className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 font-display font-medium text-base"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
            Write today&apos;s entry
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-sm" style={{ color: 'var(--fg-tertiary)' }}>No entries match that date.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          {shelves.map((shelf, si) => (
            <div key={si} className="relative">
              <div className="flex items-end gap-2 px-4 pb-0">
                <AnimatePresence mode="popLayout">
                  {shelf.map(entry => {
                    const p = prefs[entry.id] ?? {};
                    const colorIdx = p.colorIdx ?? hashColorIdx(entry.id);
                    const sizeIdx = p.sizeIdx ?? 1;
                    const color = PALETTE[colorIdx];
                    const size = SIZES[sizeIdx];
                    const height = size.height;
                    const { line1, line2 } = formatSpineDate(entry.created_at);
                    const spineW = SPINE_WIDTH;
                    const spineDepth = 9;

                    return (
                      <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 10 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        className="relative flex-shrink-0"
                        whileHover={{ y: -8, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
                      >

                        {/* Book spine */}
                        <div
                          className="book-spine relative rounded-sm select-none"
                          style={{
                            width: spineW, height,
                            background: color.bg,
                            boxShadow: '3px 0 10px rgba(0,0,0,0.18), inset -3px 0 8px rgba(0,0,0,0.08)',
                          }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 rounded-l-sm"
                            style={{ width: spineDepth, background: 'linear-gradient(to right, rgba(0,0,0,0.22), rgba(0,0,0,0.06))' }} />
                          <div className="absolute right-0 top-0 bottom-0"
                            style={{ width: 2, background: 'rgba(255,255,255,0.18)', borderRadius: '0 2px 2px 0' }} />
                          <div className="absolute flex items-center justify-center" style={{ top: 0, bottom: 0, left: spineDepth, right: 0 }}>
                            <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span className="font-display font-bold uppercase"
                                style={{ fontSize: 12, color: color.text, letterSpacing: '0.07em', lineHeight: 1 }}>{line1}</span>
                              <span className="font-display"
                                style={{ fontSize: 10, color: color.text, opacity: 0.6, letterSpacing: '0.05em', lineHeight: 1 }}>{line2}</span>
                            </div>
                          </div>
                        </div>

                        {/* Overlay: top + bottom bands = picker, middle = navigate */}
                        <div className="absolute inset-0 flex flex-col" style={{ zIndex: 10 }}>
                          {['top', 'bottom'].map(pos => (
                            <button key={pos} onClick={e => {
                              e.preventDefault(); e.stopPropagation();
                              const rect = (e.currentTarget.closest('.book-spine') as HTMLElement)?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
                              setPickerRect(rect); setPickerColorIdx(colorIdx); setPickerSizeIdx(sizeIdx);
                              setPickerFor(pickerFor === entry.id ? null : entry.id);
                            }} style={{ height: 14, flexShrink: 0, order: pos === 'top' ? 0 : 2, display: 'flex', alignItems: pos === 'top' ? 'flex-end' : 'flex-start', paddingBottom: pos === 'top' ? 2 : 0, paddingTop: pos === 'bottom' ? 2 : 0 }}>
                              <div style={{ width: '100%', height: 5, background: 'rgba(0,0,0,0.13)' }} />
                            </button>
                          ))}
                          <Link href={`/daylist/${entry.id}`} className="flex-1" style={{ order: 1 }} aria-label="Open entry" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Shelf board */}
              <div style={{ height: 10, background: 'linear-gradient(to bottom, var(--fg), rgba(128,128,128,0.2))', opacity: 0.09, borderRadius: '0 0 4px 4px' }} />
              <div style={{ height: 2, background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Picker portal — renders above all overflow:hidden parents */}
      {typeof window !== 'undefined' && pickerFor && pickerRect && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPickerFor(null)} />
          <AnimatePresence>
            <BookPicker
              key={pickerFor}
              colorIdx={pickerColorIdx}
              sizeIdx={pickerSizeIdx}
              anchorRect={pickerRect}
              onColor={i => { updatePref(pickerFor, { colorIdx: i }); setPickerColorIdx(i); }}
              onSize={i => { updatePref(pickerFor, { sizeIdx: i }); setPickerSizeIdx(i); }}
              onClose={() => setPickerFor(null)}
            />
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
