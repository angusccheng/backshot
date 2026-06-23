'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

const CROP_KEY = 'diary-photo-crops';

export function getCropPosition(id: string): string {
  if (typeof window === 'undefined') return '50% 50%';
  try {
    const store = JSON.parse(localStorage.getItem(CROP_KEY) || '{}');
    return store[id] || '50% 50%';
  } catch { return '50% 50%'; }
}

function saveCropPosition(id: string, pos: string) {
  try {
    const store = JSON.parse(localStorage.getItem(CROP_KEY) || '{}');
    store[id] = pos;
    localStorage.setItem(CROP_KEY, JSON.stringify(store));
  } catch {}
}

interface Props {
  photoId: string;
  src: string;
  onClose: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onSave?: (pos: string) => void;
}

// Corner L-bracket handle
function CornerHandle({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 16;
  const thick = 2.5;
  const style: React.CSSProperties = { position: 'absolute', width: size, height: size };
  if (pos === 'tl') { style.top = 0; style.left = 0; }
  if (pos === 'tr') { style.top = 0; style.right = 0; style.transform = 'scaleX(-1)'; }
  if (pos === 'bl') { style.bottom = 0; style.left = 0; style.transform = 'scaleY(-1)'; }
  if (pos === 'br') { style.bottom = 0; style.right = 0; style.transform = 'scale(-1)'; }
  return (
    <div style={style}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: thick, background: 'white', borderRadius: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: thick, height: size, background: 'white', borderRadius: 1 }} />
    </div>
  );
}

export function PhotoCropModal({ photoId, src, onClose, onCancel, onDelete, onSave }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const stored = getCropPosition(photoId);
    const [xStr, yStr] = stored.split(' ');
    return { x: parseFloat(xStr) || 50, y: parseFloat(yStr) || 50 };
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastXY = useRef<{ x: number; y: number } | null>(null);

  // Drag-to-pan: moving mouse right shifts image right (increases x%), etc.
  const onDragStart = useCallback((clientX: number, clientY: number) => {
    dragging.current = true;
    lastXY.current = { x: clientX, y: clientY };
  }, []);

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current || !lastXY.current || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (clientX - lastXY.current.x) / rect.width * 100;
    const dy = (clientY - lastXY.current.y) / rect.height * 100;
    lastXY.current = { x: clientX, y: clientY };
    // Panning left = image moves left = object-position-x decreases
    setPos(p => ({
      x: Math.max(0, Math.min(100, p.x - dx)),
      y: Math.max(0, Math.min(100, p.y - dy)),
    }));
  }, []);

  const onDragEnd = useCallback(() => { dragging.current = false; lastXY.current = null; }, []);

  useEffect(() => {
    const up = () => onDragEnd();
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); };
  }, [onDragEnd]);

  const handleSave = () => {
    const posStr = `${Math.round(pos.x)}% ${Math.round(pos.y)}%`;
    saveCropPosition(photoId, posStr);
    onSave?.(posStr);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl overflow-hidden"
        style={{ width: 340, background: 'var(--bg)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}
      >
        {/* Header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--fg-secondary)' }}>Crop & Position</span>
        </div>

        {/* Crop preview */}
        <div
          ref={previewRef}
          className="relative select-none"
          style={{ height: 280, background: '#111', overflow: 'hidden', cursor: 'move' }}
          onMouseDown={e => onDragStart(e.clientX, e.clientY)}
          onMouseMove={e => onDragMove(e.clientX, e.clientY)}
          onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={e => { e.preventDefault(); onDragMove(e.touches[0].clientX, e.touches[0].clientY); }}
        >
          {/* The image, panned via object-position */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`, pointerEvents: 'none', userSelect: 'none' }}
            draggable={false}
          />

          {/* Rule-of-thirds grid */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Vertical lines at 33% and 66% */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, background: 'rgba(255,255,255,0.22)' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '66.66%', width: 1, background: 'rgba(255,255,255,0.22)' }} />
            {/* Horizontal lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, background: 'rgba(255,255,255,0.22)' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '66.66%', height: 1, background: 'rgba(255,255,255,0.22)' }} />
          </div>

          {/* Corner L-bracket handles */}
          <div style={{ position: 'absolute', inset: 10, pointerEvents: 'none' }}>
            <CornerHandle pos="tl" />
            <CornerHandle pos="tr" />
            <CornerHandle pos="bl" />
            <CornerHandle pos="br" />
          </div>
        </div>

        <div className="px-4 py-2 text-center text-xs" style={{ color: 'var(--fg-secondary)' }}>
          Drag to reposition
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 pb-4">
          <button onClick={onCancel ?? onClose}
            className="group flex items-center gap-1 transition-opacity hover:opacity-60 outline-none"
            style={{ color: 'var(--fg-secondary)' }}>
            <X size={11} />
            <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[4rem]"
              style={{ fontSize: 11 }}>Cancel</span>
          </button>
          <button onClick={handleSave}
            className="group flex items-center gap-1 transition-opacity hover:opacity-60 outline-none"
            style={{ color: 'var(--fg-secondary)' }}>
            <Check size={11} />
            <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-[3rem]"
              style={{ fontSize: 11 }}>Save</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
