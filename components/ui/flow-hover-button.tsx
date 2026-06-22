'use client';

import { motion } from 'motion/react';
import * as React from 'react';
import { cn } from '@/lib/utils';

const FILL_DURATION = 0.5;
const FILL_EASE = [0.16, 1, 0.3, 1] as const;

function getCoverDiameter(w: number, h: number, x: number, y: number) {
  return Math.ceil(2 * Math.max(
    Math.hypot(x, y), Math.hypot(w - x, y),
    Math.hypot(x, h - y), Math.hypot(w - x, h - y),
  ));
}

function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden>
      <defs>
        <filter id="button-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="50" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="3" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onAnimationEnd' | 'onAnimationIteration' | 'onAnimationStart'
  | 'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragExit'
  | 'onDragLeave' | 'onDragOver' | 'onDragStart' | 'onDrop'
> & { icon?: React.ReactNode };

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ children, icon, className, disabled, onClick,
    onPointerEnter, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel, ...props }, ref) => {

    const btnRef = React.useRef<HTMLButtonElement>(null);
    const [hovered, setHovered] = React.useState(false);
    const [pressed, setPressed] = React.useState(false);
    const [origin, setOrigin] = React.useState({ x: 0, y: 0 });
    const [coverSize, setCoverSize] = React.useState(0);

    const updateOrigin = React.useCallback((x: number, y: number) => {
      const node = btnRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setOrigin({ x, y });
      setCoverSize(getCoverDiameter(rect.width, rect.height, x, y));
    }, []);

    const fromPointer = React.useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      updateOrigin(e.clientX - rect.left, e.clientY - rect.top);
    }, [updateOrigin]);

    const showFill = !disabled && (hovered || pressed);

    return (
      <>
        <motion.button
          {...props}
          ref={(node) => {
            (btnRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          disabled={disabled}
          onClick={onClick}
          onPointerEnter={(e) => { onPointerEnter?.(e); if (!disabled) { fromPointer(e); setHovered(true); } }}
          onPointerLeave={(e) => { onPointerLeave?.(e); setHovered(false); setPressed(false); }}
          onPointerDown={(e) => { onPointerDown?.(e); if (!disabled && e.button === 0) { fromPointer(e); setPressed(true); setHovered(true); } }}
          onPointerUp={(e) => { onPointerUp?.(e); setPressed(false); }}
          onPointerCancel={(e) => { onPointerCancel?.(e); setPressed(false); }}
          whileTap={disabled ? undefined : { scale: 0.985 }}
          className={cn(
            'relative inline-flex items-center justify-center gap-2 overflow-hidden cursor-pointer',
            'rounded-lg px-8 py-3.5 font-display font-medium text-base',
            'select-none touch-manipulation',
            'outline-none focus:outline-none focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-40',
            'bg-[var(--fg)] text-[var(--bg)]',
            showFill && 'text-[var(--bg)]',
            className,
          )}
        >
          {/* Cursor-origin fill */}
          <motion.span
            aria-hidden
            animate={{ scale: showFill && coverSize > 0 ? 1 : 0 }}
            initial={false}
            transition={{ duration: FILL_DURATION, ease: FILL_EASE }}
            className="pointer-events-none absolute rounded-full bg-[var(--fg)] -translate-x-1/2 -translate-y-1/2"
            style={{ width: coverSize, height: coverSize, left: origin.x, top: origin.y }}
          />
          {icon}
          <span className="relative z-10" style={{ letterSpacing: '-0.01em' }}>{children}</span>
        </motion.button>
      </>
    );
  }
);
Button.displayName = 'Button';
