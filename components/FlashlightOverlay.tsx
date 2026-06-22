'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { useFlashlight } from '@/components/FlashlightContext';

export function FlashlightOverlay() {
  const { theme } = useTheme();
  const { active } = useFlashlight();
  const posRef = useRef({ x: -999, y: -999 });
  const [, forceUpdate] = useState(0);
  const rafRef = useRef<number | null>(null);

  const onMove = useCallback((e: MouseEvent) => {
    posRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        forceUpdate(n => n + 1);
        rafRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    if (active) {
      window.addEventListener('mousemove', onMove);
    } else {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [active, onMove]);

  if (!active || theme !== 'dark') return null;

  const { x, y } = posRef.current;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[55]"
      style={{
        background: `radial-gradient(circle 220px at ${x}px ${y}px,
          rgba(255, 200, 60, 0.18) 0px,
          rgba(255, 170, 30, 0.10) 80px,
          rgba(0, 0, 0, 0.92) 200px,
          rgba(0, 0, 0, 0.97) 100%
        )`,
      }}
    />
  );
}
