'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useMagnifier } from '@/components/MagnifierContext';

const LENS_R = 110;
const ZOOM = 2.5;

export function MagnifierOverlay() {
  const { theme } = useTheme();
  const { active, setActive } = useMagnifier();
  const lensRef = useRef<HTMLDivElement>(null);
  const cloneWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ready, setReady] = useState(false);

  // Turn off when switching to dark
  useEffect(() => {
    if (theme === 'dark') setActive(false);
  }, [theme, setActive]);

  // Build and periodically refresh the DOM clone
  useEffect(() => {
    if (!active) { setReady(false); return; }

    const sync = () => {
      const wrap = cloneWrapRef.current;
      if (!wrap) return;
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Snapshot scroll positions of all scrollable elements before cloning
      const scrollables = Array.from(document.body.querySelectorAll('*')).filter(el => {
        const s = el.scrollTop || el.scrollLeft;
        return s > 0;
      }) as HTMLElement[];
      const scrollMap = scrollables.map(el => ({
        selector: el.getAttribute('data-scroll-id') || null,
        el,
        top: el.scrollTop,
        left: el.scrollLeft,
      }));

      const clone = document.body.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-magnifier-overlay]').forEach(el => el.remove());
      clone.style.pointerEvents = 'none';
      clone.style.width = `${W}px`;
      clone.style.minHeight = `${H}px`;
      clone.style.overflow = 'hidden';
      clone.style.margin = '0';

      wrap.style.width = `${W}px`;
      wrap.style.height = `${H}px`;
      wrap.style.overflow = 'hidden';

      wrap.innerHTML = '';
      wrap.appendChild(clone);

      // Replay scroll positions on the cloned elements by matching DOM position
      const allOriginal = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
      const allClone = Array.from(clone.querySelectorAll('*')) as HTMLElement[];
      scrollMap.forEach(({ el, top, left }) => {
        const idx = allOriginal.indexOf(el);
        if (idx !== -1 && allClone[idx]) {
          allClone[idx].scrollTop = top;
          allClone[idx].scrollLeft = left;
        }
      });

      setReady(true);
    };

    sync();
    // Refresh clone at ~8fps — enough to catch content changes without overhead
    syncRef.current = setInterval(sync, 120);
    return () => {
      if (syncRef.current) clearInterval(syncRef.current);
      setReady(false);
    };
  }, [active]);

  // Move lens via transform (GPU, no layout)
  const onMove = useCallback((e: MouseEvent) => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const x = e.clientX;
      const y = e.clientY;
      const lens = lensRef.current;
      if (!lens) return;
      lens.style.transform = `translate(${x - LENS_R}px, ${y - LENS_R}px)`;
      const wrap = cloneWrapRef.current;
      if (wrap) {
        wrap.style.transform = `translate(${LENS_R - x * ZOOM}px, ${LENS_R - y * ZOOM}px) scale(${ZOOM})`;
      }
    });
  }, []);

  useEffect(() => {
    if (active) {
      window.addEventListener('mousemove', onMove, { passive: true });
    } else {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [active, onMove]);

  if (!active || theme !== 'light') return null;

  return (
    <div
      data-magnifier-overlay
      ref={lensRef}
      className="fixed z-[55] pointer-events-none"
      style={{
        top: 0,
        left: 0,
        width: LENS_R * 2,
        height: LENS_R * 2,
        borderRadius: '50%',
        overflow: 'hidden',
        willChange: 'transform',
        border: '2px solid rgba(0,0,0,0.10)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.06)',
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.15s',
      }}
    >
      {/* glass glint */}
      <div className="absolute z-10 pointer-events-none" style={{
        top: 10, left: 22, width: 40, height: 14, borderRadius: '50%',
        background: 'rgba(255,255,255,0.45)', transform: 'rotate(-20deg)', filter: 'blur(3px)',
      }} />
      <div
        ref={cloneWrapRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
