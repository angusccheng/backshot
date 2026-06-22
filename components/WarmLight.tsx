'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function WarmLight() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${e.clientX}px`;
      glowRef.current.style.top = `${e.clientY}px`;
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden dark:hidden">
      {/* Lamp arc at top-center */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 900 }}>
        {/* Left beam */}
        <motion.div
          initial={{ opacity: 0, width: '10rem' }}
          animate={{ opacity: 1, width: '32rem' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            right: '50%',
            height: '22rem',
            background: 'conic-gradient(from 70deg at center top, #C8936A22, #E8C49A18, transparent)',
            filter: 'blur(2px)',
          }}
        />
        {/* Right beam */}
        <motion.div
          initial={{ opacity: 0, width: '10rem' }}
          animate={{ opacity: 1, width: '32rem' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            height: '22rem',
            background: 'conic-gradient(from 290deg at center top, transparent, #E8C49A18, #C8936A22)',
            filter: 'blur(2px)',
          }}
        />
        {/* Hot center glow */}
        <motion.div
          initial={{ opacity: 0, width: '6rem' }}
          animate={{ opacity: 1, width: '14rem' }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '-2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '12rem',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at top, #C8936A28 0%, transparent 70%)',
            filter: 'blur(16px)',
          }}
        />
        {/* Horizontal bar */}
        <motion.div
          initial={{ opacity: 0, width: '8rem' }}
          animate={{ opacity: 0.6, width: '28rem' }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            height: 1,
            background: 'linear-gradient(to right, transparent, #C8936A60, transparent)',
          }}
        />
      </div>

      {/* Mouse-tracking warm glow */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,147,106,0.10) 0%, rgba(232,196,154,0.06) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.08s ease-out, top 0.08s ease-out',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

// Dark mode version — cooler amber instead of warm orange
export function WarmLightDark() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${e.clientX}px`;
      glowRef.current.style.top = `${e.clientY}px`;
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden dark:block">
      {/* Lamp arc */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 900 }}>
        <motion.div
          initial={{ opacity: 0, width: '10rem' }}
          animate={{ opacity: 1, width: '32rem' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: 0, right: '50%', height: '22rem',
            background: 'conic-gradient(from 70deg at center top, #A0703A18, #C8936A12, transparent)',
            filter: 'blur(2px)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, width: '10rem' }}
          animate={{ opacity: 1, width: '32rem' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: 0, left: '50%', height: '22rem',
            background: 'conic-gradient(from 290deg at center top, transparent, #C8936A12, #A0703A18)',
            filter: 'blur(2px)',
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '-2rem', left: '50%', transform: 'translateX(-50%)',
            width: '14rem', height: '12rem', borderRadius: '50%',
            background: 'radial-gradient(ellipse at top, #C8936A20 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, width: '8rem' }}
          animate={{ opacity: 0.4, width: '28rem' }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
            height: 1,
            background: 'linear-gradient(to right, transparent, #C8936A50, transparent)',
          }}
        />
      </div>

      {/* Mouse glow */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,147,106,0.07) 0%, rgba(160,112,58,0.04) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.08s ease-out, top 0.08s ease-out',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
